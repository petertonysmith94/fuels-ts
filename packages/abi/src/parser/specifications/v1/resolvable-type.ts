import { swayTypeMatchers } from '../../../matchers/sway-type-matchers';
import type { AbiTypeMetadata } from '../../abi';

import { ResolvedType } from './resolved-type';
import type {
  AbiComponentV1,
  AbiConcreteTypeV1,
  AbiMetadataTypeV1,
  AbiSpecificationV1,
  AbiTypeArgumentV1,
} from './specification';

interface ResolvableComponent {
  name: string;
  type: ResolvableType | ResolvedType;
}

export class ResolvableType {
  private metadataType: AbiMetadataTypeV1;
  type: string;
  components: ResolvableComponent[] | undefined;

  toAbiType(): AbiTypeMetadata {
    return {
      metadataTypeId: this.metadataTypeId,
      components: this.components?.map((c) => ({ name: c.name, type: c.type.toAbiType() })),
      swayType: this.type,
      typeParameters: this.typeParamsArgsMap?.map(([, t]) => (t as ResolvableType).toAbiType()),
    };
  }

  constructor(
    private abi: AbiSpecificationV1,
    public metadataTypeId: number,
    public typeParamsArgsMap: Array<[number, ResolvedType | ResolvableType]> | undefined
  ) {
    const metadataType = abi.metadataTypes.find(
      (tm) => tm.metadataTypeId === metadataTypeId
    ) as AbiMetadataTypeV1;

    this.metadataType = metadataType;
    this.type = metadataType.type;

    this.typeParamsArgsMap ??= ResolvableType.mapTypeParametersAndArgs(
      abi,
      metadataType,
      undefined
    );

    let components = metadataType.components;

    /**
     * Vectors consist of multiple components,
     * but we only care about the `buf`'s first type argument
     * which defines the type of the vector data.
     * Everything else is being ignored,
     * as it's then easier to reason about the vector
     * (you just treat is as a regular struct).
     */
    if (swayTypeMatchers.vector({ swayType: metadataType.type })) {
      components = components?.map((c) => {
        if (c.name === 'buf') {
          return {
            ...c.typeArguments?.[0],
            name: c.name,
          };
        }
        return c;
      }) as AbiComponentV1[];
    }

    this.components = components?.map((c) => ResolvableType.handleComponent(this, abi, c));
  }

  private static mapTypeParametersAndArgs(
    abi: AbiSpecificationV1,
    metadataType: AbiMetadataTypeV1,
    args: (ResolvableType | ResolvedType)[] | undefined
  ): Array<[number, ResolvedType | ResolvableType]> | undefined {
    if (!args) {
      return metadataType.typeParameters?.map((typeParameter) => [
        typeParameter,
        new ResolvableType(abi, typeParameter, undefined),
      ]);
    }

    return metadataType.typeParameters?.map((typeParameter, idx) => [typeParameter, args[idx]]);
  }

  private static handleComponent(
    parent: ResolvableType,
    abi: AbiSpecificationV1,
    c: AbiComponentV1 | AbiTypeArgumentV1
  ): ResolvableComponent {
    const name = (c as AbiComponentV1).name;

    if (typeof c.typeId === 'string') {
      const concreteType = abi.concreteTypes.find(
        (ct) => ct.concreteTypeId === c.typeId
      ) as AbiConcreteTypeV1;
      return {
        name,
        type: ResolvableType.resolveConcreteType(abi, concreteType),
      };
    }

    const mt = abi.metadataTypes.find((tm) => tm.metadataTypeId === c.typeId) as AbiMetadataTypeV1;

    return {
      name,
      type: ResolvableType.handleMetadataType(parent, abi, mt, c.typeArguments),
    };
  }

  /**
   * Concrete types are *resolved* because everything is known about them.
   */
  private static resolveConcreteType(
    abi: AbiSpecificationV1,
    type: AbiConcreteTypeV1
  ): ResolvedType {
    if (type.metadataTypeId === undefined) {
      return new ResolvedType({
        type: type.type,
        typeId: type.concreteTypeId,
      });
    }

    if (!type.typeArguments) {
      return new ResolvableType(abi, type.metadataTypeId, undefined).resolveInternal(
        type.concreteTypeId,
        undefined
      );
    }

    const metadataType = abi.metadataTypes.find(
      (mt) => mt.metadataTypeId === type.metadataTypeId
    ) as AbiMetadataTypeV1;

    const concreteTypeArgs = type.typeArguments.map((ta) => {
      const concreteTypeArg = abi.concreteTypes.find(
        (ct) => ct.concreteTypeId === ta
      ) as AbiConcreteTypeV1;
      return ResolvableType.resolveConcreteType(abi, concreteTypeArg);
    });

    return new ResolvableType(
      abi,
      type.metadataTypeId,
      ResolvableType.mapTypeParametersAndArgs(abi, metadataType, concreteTypeArgs)
    ).resolveInternal(type.concreteTypeId, undefined);
  }

  /**
   * Metadata types are *handled* and not *resolved* because they might be generic,
   * in which case they cannot be resolved.
   * If they're not generic, they can be immediately resolved.
   */
  private static handleMetadataType(
    parent: ResolvableType,
    abi: AbiSpecificationV1,
    mt: AbiMetadataTypeV1,
    typeArguments: AbiComponentV1['typeArguments']
  ): ResolvableType | ResolvedType {
    if (swayTypeMatchers.generic({ swayType: mt.type })) {
      const resolvedTypeParameter = parent.typeParamsArgsMap?.find(
        ([tp]) => tp === mt.metadataTypeId
      )?.[1];

      return resolvedTypeParameter ?? new ResolvableType(abi, mt.metadataTypeId, undefined);
    }

    if (!mt.components) {
      /**
       * types like u8, u16 can make their way into metadata types
       * if they aren't used _directly_ in a function-input/function-output/log/configurable/messageType
       * These types are characterized by not having components and we can resolve them as-is
       */
      return new ResolvableType(abi, mt.metadataTypeId, undefined).resolveInternal(
        mt.metadataTypeId,
        undefined
      );
    }

    const typeArgs = typeArguments?.map((ta) => this.handleComponent(parent, abi, ta).type);

    const resolvable = new ResolvableType(
      abi,
      mt.metadataTypeId,
      this.mapTypeParametersAndArgs(abi, mt, typeArgs)
    );

    if (typeArgs?.every((ta) => ta instanceof ResolvedType)) {
      return resolvable.resolveInternal(mt.metadataTypeId, undefined);
    }

    if (resolvable.components?.every((comp) => comp.type instanceof ResolvedType)) {
      return resolvable.resolveInternal(mt.metadataTypeId, undefined);
    }

    return resolvable;
  }

  private resolveInternal(
    typeId: string | number,
    typeParamsArgsMap: Array<[number, ResolvedType]> | undefined
  ): ResolvedType {
    const typeArgs = this.resolveTypeArgs(typeParamsArgsMap);

    const components: ResolvedType['components'] = this.components?.map((c) => {
      if (c.type instanceof ResolvedType) {
        return c as { name: string; type: ResolvedType };
      }

      const resolvedGenericType = typeArgs?.find(
        ([tp]) => (c.type as ResolvableType).metadataTypeId === tp
      )?.[1];
      if (resolvedGenericType) {
        return {
          name: c.name,
          type: resolvedGenericType,
        };
      }
      return { name: c.name, type: c.type.resolveInternal(c.type.metadataTypeId, typeArgs) };
    });
    return new ResolvedType({
      type: this.metadataType.type,
      typeId,
      components,
      typeParamsArgsMap: typeArgs,
      metadataTypeId: this.metadataTypeId,
    });
  }

  private resolveTypeArgs(
    typeParamsArgsMap: Array<[number, ResolvedType]> | undefined
  ): [number, ResolvedType][] | undefined {
    return this.typeParamsArgsMap === undefined
      ? typeParamsArgsMap
      : this.typeParamsArgsMap.map(([typeParameter, value]) => {
          if (value instanceof ResolvableType) {
            const resolved = typeParamsArgsMap?.find(([tp]) => tp === value.metadataTypeId);

            return (
              resolved ?? [
                +typeParameter,
                value.resolveInternal(value.metadataTypeId, typeParamsArgsMap),
              ]
            );
          }

          return [+typeParameter, value];
        });
  }

  public resolve(concreteType: AbiConcreteTypeV1) {
    const concreteTypeArgs = concreteType.typeArguments?.map((ta) => {
      const concreteTypeArg = this.abi.concreteTypes.find(
        (ct) => ct.concreteTypeId === ta
      ) as AbiConcreteTypeV1;
      return ResolvableType.resolveConcreteType(this.abi, concreteTypeArg);
    });

    const typeParamsArgsMap = ResolvableType.mapTypeParametersAndArgs(
      this.abi,
      this.metadataType,
      concreteTypeArgs
    ) as Array<[number, ResolvedType]>;

    return this.resolveInternal(concreteType.concreteTypeId, typeParamsArgsMap);
  }
}
