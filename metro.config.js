const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

config.resolver = config.resolver ?? {};
config.resolver.blockList = [
  /\.local[/\\]state[/\\].*/,
  /\.local[/\\]skills[/\\].*/,
];

// Metro alias "@" alone does not match "@/foo" — resolve @/ and @shared/ explicitly.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const target = path.join(projectRoot, moduleName.slice(2));
    return context.resolveRequest(context, target, platform);
  }
  if (moduleName.startsWith("@shared/")) {
    const target = path.join(projectRoot, "shared", moduleName.slice("@shared/".length));
    return context.resolveRequest(context, target, platform);
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
