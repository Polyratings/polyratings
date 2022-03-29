// @ts-expect-error polyfill
if (!Reflect.getMetadata) {
    // eslint-disable-next-line no-console
    console.warn(
        "reflect-metadata is not enabled. class-tansformer and class-validator features of @polyratings/shared will result in an error",
    );
    // @ts-expect-error polyfill
    Reflect.getMetadata = () => null;
}
