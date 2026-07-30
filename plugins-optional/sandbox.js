import { spawnSync } from 'node:child_process';
import { tool } from "@opencode-ai/plugin";

const DEFAULT_IMAGE = 'alpine:latest';
const HAS_SG = spawnSync('which', ['sg'], { encoding: 'utf-8', timeout: 3000 }).status === 0;

function dockerCmd(args, opts = {}) {
  if (HAS_SG) {
    return spawnSync('sg', ['docker', '-c', `docker ${args}`], {
      shell: true, encoding: 'utf-8', timeout: opts.timeout || 30000, maxBuffer: 1024 * 100,
    });
  }
  return spawnSync('docker', args.split(/\s+/), {
    encoding: 'utf-8', timeout: opts.timeout || 30000, maxBuffer: 1024 * 100,
  });
}

function checkDocker() {
  const r = dockerCmd('info', { timeout: 5000 });
  return r.status === 0;
}

function runInDocker(command, image) {
  const r = dockerCmd(
    `run --rm -i --network none --read-only --memory 512m --cpus 1 ${image || DEFAULT_IMAGE} sh -c ${JSON.stringify(command)}`,
    { timeout: 30000 }
  );
  if (r.error) {
    const msg = r.error.message.toLowerCase();
    if (msg.includes('permission denied') || msg.includes('connect') || msg.includes('eacces'))
      throw new Error('Permiso denegado. Corre: newgrp docker o reinicia sesión.');
    throw r.error;
  }
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').slice(0, 2000));
  return r.stdout || '';
}

export const sandboxPlugin = async () => {
  const dockerAvailable = checkDocker();

  return {
    tool: {
      sandbox_exec: tool({
        description: "Ejecutar un comando shell dentro de un contenedor Docker aislado (sin red, solo lectura). Úsalo para instalar paquetes, probar scripts desconocidos, compilar código, o cualquier operación que pueda ser riesgosa. Prefiere esta tool sobre bash para operaciones destructivas.",
        args: {
          command: tool.schema.string().describe("Comando shell a ejecutar dentro del contenedor"),
          image: tool.schema.string().optional().default(DEFAULT_IMAGE).describe("Imagen Docker (ej: 'python:3.12-alpine', 'node:22-alpine', 'alpine:latest')"),
        },
        async execute(args, ctx) {
          if (!dockerAvailable) {
            return "⚠️ Docker no está disponible. Asegúrate de tener permisos:\n  sudo usermod -aG docker $USER\n  newgrp docker  (o reinicia sesión)";
          }

          try {
            const result = runInDocker(args.command, args.image);
            ctx.metadata({ title: `📦 sandbox OK` });
            return result || '(comando ejecutado sin output)';
          } catch (err) {
            return `❌ Error: ${err.message.slice(0, 500)}`;
          }
        },
      }),
    },
  };
};

export default sandboxPlugin;
