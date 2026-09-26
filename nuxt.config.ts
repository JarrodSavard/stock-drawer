export default defineNuxtConfig({
  compatibilityDate: '2026-09-25',
  devtools: { enabled: false },
  css: [
    '@fontsource-variable/dm-sans',
    '@fontsource/instrument-serif/latin-400.css',
    '@fontsource/instrument-serif/latin-400-italic.css',
    '~/assets/css/main.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Stock Drawer — A pattern playground by Jarrod Savard',
      meta: [
        {
          name: 'description',
          content:
            'Sketch a shape and discover stock-market history that looks like it. A playful portfolio experiment in interactive charts by Jarrod Savard.',
        },
        { name: 'author', content: 'Jarrod Savard' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  typescript: { strict: true },
})
