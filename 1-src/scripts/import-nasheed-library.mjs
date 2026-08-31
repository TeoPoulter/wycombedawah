import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { spawn } from 'node:child_process';

const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Pass the path to the 1% NASHEEDS ARCHIVE folder.');

const outputRoot = new URL('../../1/media/nasheeds/', import.meta.url);
const playlists = [
  { id: 'ambience', folder: 'WMC - Ambience', title: 'WMC Ambience', description: 'Atmospheric, reflective background nasheeds.' },
  { id: 'chill', folder: 'WMC - Chill', title: 'WMC Chill', description: 'Calm vocals for a relaxed room.' },
  { id: 'upbeat', folder: 'WMC - Upbeat', title: 'WMC Upbeat', description: 'Bright, energetic vocals for the show.' }
];

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed: ${stderr.slice(-1200)}`)));
});

const probeDuration = (path) => new Promise((resolve, reject) => {
  const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]);
  let output = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(Math.round(Number(output.trim()) || 0)) : reject(new Error(stderr)));
});

const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase()
  .slice(0, 72) || 'track';

const cleanTitle = (filename) => basename(filename, extname(filename))
  .replace(/[＊#]/g, ' ')
  .replace(/[｜|]+/g, ' · ')
  .replace(/\s+/g, ' ')
  .trim();

await mkdir(outputRoot, { recursive: true });
const library = { version: 1, generatedAt: new Date().toISOString(), playlists: [] };

for (const playlist of playlists) {
  const sourceFolder = join(sourceRoot, playlist.folder);
  const outputFolder = new URL(`${playlist.id}/`, outputRoot);
  await mkdir(outputFolder, { recursive: true });
  const files = (await readdir(sourceFolder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
  const cover = files.find((file) => /\.png$/i.test(file));
  const tracks = files.filter((file) => /\.mp4$/i.test(file)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  if (!cover || !tracks.length) throw new Error(`${playlist.folder} needs one PNG cover and at least one MP4 track.`);

  const coverOutput = new URL('cover.webp', outputFolder);
  await run('cwebp', ['-quiet', '-q', '84', '-resize', '900', '0', join(sourceFolder, cover), '-o', coverOutput.pathname]);

  const importedTracks = [];
  for (let index = 0; index < tracks.length; index += 1) {
    const source = join(sourceFolder, tracks[index]);
    const file = `${String(index + 1).padStart(2, '0')}-${slugify(tracks[index])}.mp3`;
    const output = new URL(file, outputFolder);
    process.stdout.write(`[${playlist.title}] ${index + 1}/${tracks.length} ${cleanTitle(tracks[index])}\n`);
    await run('ffmpeg', [
      '-y', '-v', 'error', '-i', source, '-map', '0:a:0', '-vn',
      '-c:a', 'libmp3lame', '-b:a', '112k', '-ar', '44100', '-ac', '2',
      '-map_metadata', '-1', output.pathname
    ]);
    importedTracks.push({
      id: `${playlist.id}-${String(index + 1).padStart(2, '0')}`,
      title: cleanTitle(tracks[index]),
      src: `/1/media/nasheeds/${playlist.id}/${file}`,
      duration: await probeDuration(output.pathname)
    });
  }

  library.playlists.push({
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    cover: `/1/media/nasheeds/${playlist.id}/cover.webp`,
    tracks: importedTracks
  });
}

await writeFile(new URL('library.json', outputRoot), `${JSON.stringify(library, null, 2)}\n`);
console.log(`Imported ${library.playlists.reduce((total, playlist) => total + playlist.tracks.length, 0)} tracks.`);
