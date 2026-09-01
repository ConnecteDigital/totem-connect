// Rasteriza os SVGs de ícone pra PNG. Rodar: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const icon = readFileSync('public/icons/icon.svg')
const mask = readFileSync('public/icons/maskable.svg')

await sharp(icon).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(icon).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(mask).resize(512, 512).png().toFile('public/icons/maskable-512.png')
await sharp(icon).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
await sharp(icon).resize(32, 32).png().toFile('public/favicon-32.png')

console.log('icones gerados em public/icons/')
