// Generates neutral SVG placeholders for photography we don't have. Replace via the admin dashboard.
import fs from 'node:fs';
const out = 'public/images';
fs.mkdirSync(`${out}/products`, { recursive: true });

const prod = (kind, label, accent) => {
  const shapes = {
    dropper: `<rect x="176" y="120" width="48" height="26" rx="10" fill="#F4F6FA" stroke="#C9D2E3"/><rect x="186" y="146" width="28" height="22" fill="#B8C0CC"/><rect x="150" y="168" width="100" height="170" rx="24" fill="${accent}"/><rect x="164" y="236" width="72" height="62" rx="6" fill="#F8FAFD" opacity=".92"/><text x="200" y="262" font-family="Georgia,serif" font-size="9" text-anchor="middle" fill="#1B2A4A">${label}</text><text x="200" y="276" font-family="Georgia,serif" font-size="7" text-anchor="middle" fill="#6B7A90">SERUM</text>`,
    jar: `<ellipse cx="200" cy="168" rx="86" ry="22" fill="#FFFFFF" stroke="#D6DDEB"/><rect x="114" y="168" width="172" height="40" fill="#C8CFDB"/><rect x="114" y="208" width="172" height="96" rx="20" fill="${accent}"/><ellipse cx="200" cy="304" rx="86" ry="14" fill="${accent}"/><text x="200" y="262" font-family="Georgia,serif" font-size="14" text-anchor="middle" fill="#fff">${label}</text>`,
    tube: `<path d="M158 120h84l12 190a16 16 0 0 1-16 17h-76a16 16 0 0 1-16-17z" fill="${accent}"/><rect x="170" y="318" width="60" height="26" rx="6" fill="#F4F6FA"/><text x="200" y="210" font-family="Georgia,serif" font-size="11" text-anchor="middle" fill="#fff">${label}</text>`,
    bottle: `<rect x="188" y="110" width="24" height="26" rx="6" fill="#1B2A4A"/><rect x="180" y="136" width="40" height="30" fill="#B8C0CC"/><rect x="164" y="166" width="72" height="170" rx="14" fill="${accent}"/><text x="200" y="232" font-family="Georgia,serif" font-size="13" text-anchor="middle" fill="#fff">${label}</text>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#FFFFFF"/><ellipse cx="200" cy="344" rx="90" ry="9" fill="#1B2A4A" opacity=".08"/>${shapes[kind]}</svg>`;
};
const P = {
  'hyaluronic-acid-serum': ['dropper', 'HYALURONIC', '#2748C4'],
  'vitamin-c-serum': ['dropper', 'VITAMIN C', '#B5651D'],
  'glow-serum': ['dropper', 'GLOW', '#3C9BD1'],
  'hydra-moisturizer': ['jar', 'AQUA GLOW', '#2748C4'],
  'daily-cleanser': ['tube', 'CLEANSER', '#1B2A4A'],
  'niacinamide-10-serum': ['dropper', 'NIACINAMIDE', '#1B2A4A'],
  'sun-shield-spf-50': ['bottle', 'SUN SHIELD', '#1B2FA0'],
  'collagen-cream': ['jar', 'COLLAGEN', '#6F86C8'],
};
for (const [slug, [k, l, c]] of Object.entries(P)) fs.writeFileSync(`${out}/products/${slug}.svg`, prod(k, l, c));

const scene = (w, h, motif) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9EFFA"/><stop offset="1" stop-color="#F9FAFD"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${motif(w, h)}</svg>`;
const face = (w, h) => `<circle cx="${w * .5}" cy="${h * .42}" r="${Math.min(w, h) * .2}" fill="#E8C9B5"/><path d="M${w * .22} ${h} C${w * .25} ${h * .7} ${w * .75} ${h * .7} ${w * .78} ${h}Z" fill="#E8C9B5"/><path d="M${w * .3} ${h * .38} C${w * .3} ${h * .15} ${w * .7} ${h * .15} ${w * .7} ${h * .38} C${w * .62} ${h * .26} ${w * .38} ${h * .26} ${w * .3} ${h * .38}Z" fill="#3B2A24"/>`;
const leaves = (w, h) => `<rect width="${w}" height="${h}" fill="#D9BBA0"/><path d="M0 ${h * .2} Q${w * .3} 0 ${w * .5} ${h * .5} Q${w * .2} ${h * .6} 0 ${h * .2}Z" fill="#2F5D2B"/><path d="M${w} ${h * .1} Q${w * .6} ${h * .1} ${w * .55} ${h * .6} Q${w * .9} ${h * .5} ${w} ${h * .1}Z" fill="#3D7A38"/><ellipse cx="${w * .42}" cy="${h * .72}" rx="${w * .18}" ry="${h * .06}" fill="#F3EEE6"/><rect x="${w * .38}" y="${h * .42}" width="${w * .05}" height="${h * .3}" rx="8" fill="#C9902B"/><rect x="${w * .55}" y="${h * .5}" width="${w * .13}" height="${h * .2}" rx="10" fill="#F5F1EA"/>`;
const flat = (w, h) => Array.from({ length: 9 }, (_, i) => `<rect x="${w * (.12 + i * .09)}" y="${h * (.55 - i * .04)}" width="${w * .05}" height="${h * .24}" rx="8" transform="rotate(-18 ${w * (.12 + i * .09)} ${h * .6})" fill="${i % 3 === 0 ? '#2748C4' : i % 3 === 1 ? '#1B2A4A' : '#3C6FC9'}"/>`).join('');
fs.writeFileSync(`${out}/hero-model.svg`, scene(800, 900, face));
fs.writeFileSync(`${out}/treatment-model.svg`, scene(800, 900, face));
fs.writeFileSync(`${out}/about-botanical.svg`, scene(800, 560, leaves));
fs.writeFileSync(`${out}/routine-flatlay.svg`, scene(800, 450, flat));
console.log('placeholders written');
