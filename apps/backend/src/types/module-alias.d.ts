declare module "module-alias" {
  const moduleAlias: {
    addAliases(aliases: Record<string, string>): void;
  };

  // eslint-disable-next-line no-restricted-syntax
  export default moduleAlias;
}
