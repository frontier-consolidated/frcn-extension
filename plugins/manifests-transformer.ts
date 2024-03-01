import fs from "fs/promises";
import path from "path";
import { PluginOption } from "vite";
import { loadEnv } from "vite";

export default function manifestsTransformer({ configDir }: { configDir: string }) {
    let buildEnv: Record<string, string>;
    return {
        name: "manifest-transformer",
        config(config, env) {
            buildEnv = loadEnv(config.mode ?? env.mode, config.envDir ?? process.cwd())
        },
        async writeBundle(options) {
            const packagePath = path.join(process.cwd(), "package.json")
            const packageContent = await fs.readFile(packagePath, {
                encoding: "utf-8"
            })
            const packageJson = JSON.parse(packageContent) as Record<string, string | object>

            function getPackageValue(index: string[]) {
                let value = packageJson;
                for (const part of index) {
                    value = value[part] as any
                }
                return value;
            }

            const files = await fs.readdir(configDir, {
                withFileTypes: true
            })
            
            for (const file of files) {
                if (!file.isFile()) continue;

                const extension = path.extname(file.name)
                if (extension !== ".json") continue;

                let content = await fs.readFile(path.join(file.path, file.name), {
                    encoding: "utf-8"
                })

                const configVars = content.matchAll(/{{(.+?)}}/g)
                for (const match of configVars) {
                    const path = match[1]
                    const [objectName, ...index] = path.split(".")

                    let value: any = undefined;
                    if (objectName === "env") {
                        value = buildEnv[index[0]]
                    } else if (objectName === "package") {
                        value = getPackageValue(index)
                    }

                    content = content.replaceAll(match[0], value);
                }
                
                const outPath = path.join(options.dir!, "config", file.name)
                await fs.mkdir(path.dirname(outPath), {
                    recursive: true
                })
                await fs.writeFile(outPath, content, {
                    encoding: "utf-8",
                })
            }
        }
    } satisfies PluginOption
}