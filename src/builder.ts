/**
 * A configuration object that is passed to the `configureMockBuilder` function.
 */
interface MockBuilderInitialConfig<TFaker> {
  /**
   * A value that will be passed to the default builder function.
   * This is usually a faker instance.
   */
  readonly faker: TFaker;
}

type Overrideable<TValue> = {
  readonly [P in keyof TValue]?: TValue[P];
};

export function configureMockBuilder<TFaker>(config: MockBuilderInitialConfig<TFaker>) {
  type DefaultBuilder<TValue> = (faker: TFaker) => TValue;

  type OverrideBuilder<TOverrides> = TOverrides | ((faker: TFaker) => TOverrides);

  type MockBuilder<TValue> = {
    (): TValue;
    <TOverrides extends Overrideable<TValue>>(overrides: OverrideBuilder<TOverrides>): TValue & TOverrides;
  };

  function createMockBuilder<TValue>(build: DefaultBuilder<TValue>): MockBuilder<TValue> {
    return function buildMock<TOverrides extends Partial<TValue>>(override?: OverrideBuilder<TOverrides>) {
      const original = build(config.faker);

      // Unwrap the override if it's a function.
      if (typeof override === "function") {
        override = override(config.faker);
      }

      // If both the original and the override are objects, we merge them.
      if (typeof original === "object" && original !== null) {
        if (typeof override === "object" && override !== null) {
          return Object.assign(original, override);
        }
      }

      // To support passing undefined as an override,
      // we can check if the override is passed as as argument,
      // instead of looking at the type.
      if (arguments.length) {
        return override;
      }

      return original;
    };
  }

  return { createMockBuilder };
}
