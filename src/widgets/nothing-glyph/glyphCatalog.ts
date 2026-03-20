export interface GlyphToy {
  id: string;
  name: string;
  creator: string;
  description: string;
  jsonUrl: string;
  /** URL is an image preview, not a Lottie JSON */
  isImageOnly?: boolean;
}

const GLYPH_CATALOG: GlyphToy[] = [
  {
    id: 'dice',
    name: 'Dice (d3-d9)',
    creator: 'PaulGsk',
    description: 'Give it a roll!',
    jsonUrl: 'https://c.nothing.tech/glyphs/hVl4gdX4wLZyCVb1qcC7C.json',
  },
  {
    id: 'call-status',
    name: 'Glyph Call Status',
    creator: 'Abhishek Lakhani',
    description: 'A new way to shush people when you\'re on a phone call',
    jsonUrl: 'https://c.nothing.tech/glyphs/jrqxc0alssHB6kH2eejov.json',
  },
  {
    id: 'pendulum',
    name: 'Glyph Pendulum',
    creator: 'pauwma',
    description: 'Interactive swinging pendulum with realistic physics',
    jsonUrl: 'https://c.nothing.tech/glyphs/g3YWFDR5gkxg5kIrMYRrq.json',
  },
  {
    id: 'screenie',
    name: 'Screenie',
    creator: 'pauwma',
    description: 'Daily screen time as a living pixel face',
    jsonUrl: 'https://c.nothing.tech/glyphs/WsOxS15s5HpNppXLJnz7w.json',
  },
  {
    id: 'star-map',
    name: 'Star Map',
    creator: 'FranK',
    description: 'Tracks nearest constellation overhead',
    jsonUrl: 'https://c.nothing.tech/glyphs/iCrBOV10bMJjVVbBG0e1F.json',
  },
  {
    id: 'glyph-stack',
    name: 'Glyph Stack',
    creator: 'pauwma',
    description: 'Stacker arcade game – stack blocks, beat high score',
    jsonUrl: 'https://c.nothing.tech/glyphs/P2tJSvWlPP4jOrm8qqfix.json',
  },
  {
    id: 'counter',
    name: 'Counter',
    creator: 'Daniel',
    description: 'Display numbers 0-99 via Glyph Matrix',
    jsonUrl: 'https://c.nothing.tech/glyphs/CgucD4gYt5Iz4xm2Bfxwd.json',
  },
  {
    id: 'star-map-3',
    name: 'Star Map (Phone 3)',
    creator: 'FranK',
    description: 'Constellation tracker for Phone 3',
    jsonUrl: 'https://c.nothing.tech/glyphs/d8IsllOY391BxaARDYaoV.json',
  },
  {
    id: 'leveller',
    name: 'Leveller',
    creator: 'Rahul',
    description: 'Check if the surface is level',
    jsonUrl: 'https://c.nothing.tech/glyphs/b20fAuTyjZf9Q8WHIUYNT.json',
  },
];

export default GLYPH_CATALOG;
