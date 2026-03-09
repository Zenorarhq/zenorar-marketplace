import arcjet, { detectBot, fixedWindow, shield } from '@arcjet/next'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: 'LIVE' }),
    fixedWindow({
      mode: 'LIVE',
      max: 10,
      window: '60s',
    }),
    detectBot({
      mode: 'LIVE',
      allow: [],
    }),
  ],
})

export default aj