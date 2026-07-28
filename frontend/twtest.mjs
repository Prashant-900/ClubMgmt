import postcss from 'postcss';
import tw from '@tailwindcss/postcss';
import fs from 'fs';
const css = fs.readFileSync('app/globals.css','utf8');
const out = await postcss([tw()]).process(css, { from: '/sessions/clever-vigilant-gauss/mnt/ClubMgmt/frontend/app/globals.css' });
fs.writeFileSync('/tmp/out.css', out.css);
const need = ['bg-gh-canvas-subtle','border-gh-border-default','text-gh-text-secondary','text-gh-text-tertiary','text-gh-text-primary','bg-gh-danger-muted','text-gh-danger-fg','bg-gh-success-muted','text-gh-success-fg','text-gh-warning-fg','bg-gh-accent-emphasis','bg-heatmap-3','text-role-coordinator','border-gh-border-muted','bg-gh-border-muted','bg-gh-success-fg','border-gh-danger-emphasis\\/40','border-gh-success-emphasis\\/40'];
for (const n of need) console.log(out.css.includes('.'+n) ? 'OK   '+n : 'MISS '+n);
