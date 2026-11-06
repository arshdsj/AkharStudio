/**
 * golden-screenplay.fixture.ts
 *
 * Deterministic Golden Screenplay Fixture for Milestone M2F.
 * Realistic, multi-page Punjabi screenplay with mixed Latin/Gurmukhi terms,
 * complex dialogues, parentheticals, monologues, transitions, and anti-orphan triggers.
 */

import { ScriptDraft, ScreenplayBlock, TitleMetadata } from '../../src/types/screenplay';

export const GOLDEN_METADATA: TitleMetadata = {
  title: 'ਅੰਮ੍ਰਿਤਸਰ ਫਾਈਲਜ਼ (The Amritsar Files)',
  author: 'ਹਰਮਨਦੀਪ ਸਿੰਘ',
  basedOn: 'ਸੱਚੀਆਂ ਘਟਨਾਵਾਂ ਤੇ ਆਧਾਰਿਤ (Based on True Events)',
  rights: '© 2026 AkharStudio Cinema Productions. All Rights Reserved.',
  contact: 'screenwriter@amritsarfiles.com',
};

export const GOLDEN_BLOCKS: ScreenplayBlock[] = [
  // Page 1 Scene 1
  {
    id: 'g-b01',
    type: 'scene_heading',
    text: 'EXT. GOLDEN TEMPLE COMPLEX - NIGHT',
  },
  {
    id: 'g-b02',
    type: 'action',
    text: 'ਮੀਂਹ ਦੀ ਹਲਕੀ ਫੁਹਾਰ ਪਵਿੱਤਰ ਸਰੋਵਰ ਦੇ ਸ਼ਾਂਤ ਪਾਣੀ ਉੱਤੇ ਡਿੱਗ ਰਹੀ ਹੈ। The reflection of the illuminated Golden Temple ripples softly in the dark water. A high-resolution CCTV camera pans silently across the marble parikrama from the northern gate.',
  },
  {
    id: 'g-b03',
    type: 'action',
    text: 'INSPECTOR JAGJIT SINGH (45, dark trench coat over formal uniform, holding an iPhone 15 Pro with a cracked screen) ਤੇਜ਼ ਕਦਮਾਂ ਨਾਲ ਪਰਿਕਰਮਾ ਵੱਲ ਵਧਦਾ ਹੈ। His wireless walkie-talkie crackles with high-frequency static.',
  },
  {
    id: 'g-b04',
    type: 'character',
    text: 'RADIO VOICE (O.S.)',
  },
  {
    id: 'g-b05',
    type: 'dialogue',
    text: 'ਸਰ, Section 302 IPC ਦਾ ਮਾਮਲਾ ਦਰਜ ਹੋ ਗਿਆ ਹੈ। VIP security protocol active ਹੈ, media reporters ਬਾਹਰ ਪਹੁੰਚ ਚੁੱਕੇ ਹਨ।',
  },
  {
    id: 'g-b06',
    type: 'character',
    text: 'JAGJIT',
  },
  {
    id: 'g-b07',
    type: 'parenthetical',
    text: '(quietly into the microphone)',
  },
  {
    id: 'g-b08',
    type: 'dialogue',
    text: 'ਮੈਂ ਦੋ ਮਿੰਟ ਵਿੱਚ ਪਹੁੰਚ ਰਿਹਾ ਹਾਂ। Nobody touches the crime scene until I verify the forensic seals personally.',
  },
  {
    id: 'g-b09',
    type: 'transition',
    text: 'CUT TO:',
  },

  // Scene 2 - Police Station Investigation
  {
    id: 'g-b10',
    type: 'scene_heading',
    text: 'INT. KOTWALI POLICE STATION - CONTINUOUS',
  },
  {
    id: 'g-b11',
    type: 'action',
    text: 'A crowded police control room buzzing with landline phones and old oscillating ceiling fans. Constables are rapidly typing bilingual FIR reports on Dell desktop monitors. SHO HARPREET SINGH (52, stern Punjabi officer with graying mustache) sits behind an oak desk piled with thick case files.',
  },
  {
    id: 'g-b12',
    type: 'character',
    text: 'HARPREET',
  },
  {
    id: 'g-b13',
    type: 'dialogue',
    text: 'ਆ ਗਿਆ ਜਗਜੀਤ? ਬੈਠੋ। ਮਾਮਲਾ ਬਹੁਤ ਗੁੰਝਲ਼ਦਾਰ ਤੇ ਨਾਜ਼ੁਕ ਹੈ। The digital evidence from the central server room has been severely compromised.',
  },
  {
    id: 'g-b14',
    type: 'character',
    text: 'JAGJIT',
  },
  {
    id: 'g-b15',
    type: 'dialogue',
    text: 'ਕਿਸੇ ਨੇ ਅੰਦਰੋਂ ਹੀ encrypted hard drive ਕੱਢੀ ਹੈ। CCTV footage ਵਿੱਚ ਇੱਕ ਸ਼ੱਕੀ ਨਜ਼ਰ ਆ ਰਿਹਾ ਹੈ ਜਿਸਨੇ ਕਾਲੀ ਹੂਡੀ ਪਾਈ ਹੋਈ ਸੀ।',
  },
  {
    id: 'g-b16',
    type: 'character',
    text: 'HARPREET',
  },
  {
    id: 'g-b17',
    type: 'parenthetical',
    text: '(leaning forward, lowering his tone)',
  },
  // Long dialogue designed to cross page boundary cleanly with (MORE)/(CONT'D)
  {
    id: 'g-b18',
    type: 'dialogue',
    text: 'ਇਹ ਕੋਈ ਆਮ ਚੋਰੀ ਨਹੀਂ ਜਗਜੀਤ। This is an orchestrated conspiracy targeting the high-profile cyber crime cell. ਮੁਲਜ਼ਮਾਂ ਕੋਲ ਪੁਲਿਸ ਵਿਭਾਗ ਦੇ encrypted passwords ਪਹਿਲਾਂ ਹੀ ਮੌਜੂਦ ਸਨ। ਉਨ੍ਹਾਂ ਨੇ ਜਾਣਬੁੱਝ ਕੇ ਰਾਤ ਦੇ ਤਿੰਨ ਵਜੇ ਦਾ ਸਮਾਂ ਚੁਣਿਆ ਤਾਂ ਜੋ power backup switch ਹੋਣ ਵੇਲੇ security alarm ਬੰਦ ਰਹਿਣ। ਸਾਡੇ ਕੋਲ ਸਿਰਫ਼ ਬਾਰਾਂ ਘੰਟੇ ਹਨ ਮੁੱਖ ਮੁਲਜ਼ਮ ਨੂੰ Sri Guru Ram Dass Jee International Airport ਪਹੁੰਚਣ ਤੋਂ ਰੋਕਣ ਲਈ। ਜੇਕਰ ਉਹ ਦੇਸ਼ ਛੱਡ ਗਿਆ, ਤਾਂ ਪੰਜਾਬ ਪੁਲਿਸ ਦੀ ਸਾਖ ਮਿੱਟੀ ਵਿੱਚ ਮਿਲ ਜਾਵੇਗੀ। You have full field authority under Special Investigation Team protocol. ਅਸੀਂ ਕਿਸੇ ਵੀ ਕੀਮਤ ਉੱਤੇ ਇਹ ਡਾਟਾ ਲੀਕ ਨਹੀਂ ਹੋਣ ਦੇ ਸਕਦੇ, ਭਾਵੇਂ ਸਾਨੂੰ ਪੂਰੇ ਸ਼ਹਿਰ ਦੀ ਨਾਕਾਬੰਦੀ ਕਰਨੀ ਪਵੇ। Every exit from this jurisdiction must remain under strict 24-hour tactical surveillance.',
  },
  {
    id: 'g-b19',
    type: 'action',
    text: 'ਜਗਜੀਤ ਕੇਸ ਫਾਈਲ ਖੋਲ੍ਹਦਾ ਹੈ। He examines the printed cyber forensic logs and blue wax stamp markings. ਪੰਨੇ ਦੇ ਸਿਖ਼ਰ ਉੱਤੇ ਲਾਲ ਸਿਆਹੀ ਨਾਲ ਇੱਕ ਨੰਬਰ ਲਿਖਿਆ ਹੋਇਆ ਹੈ: Crime Case #84/2026.',
  },

  // Scene 3 - Heritage Street Confrontation
  {
    id: 'g-b20',
    type: 'scene_heading',
    text: 'EXT. HERITAGE STREET - DAWN',
  },
  {
    id: 'g-b21',
    type: 'action',
    text: 'The historic promenade is shrouded in thick winter mist. ਸਵੇਰ ਦੀ ਠੰਢੀ ਹਵਾ ਚੱਲ ਰਹੀ ਹੈ। ਇੱਕ ਕਾਲੇ ਰੰਗ ਦੀ Mahindra Scorpio ਤੇਜ਼ ਰਫ਼ਤਾਰ ਨਾਲ ਚੌਕ ਵੱਲ ਮੁੜਦੀ ਹੈ। Jagjit stands near an old brass tea stall, observing the surveillance drone hovering silently overhead.',
  },
  {
    id: 'g-b22',
    type: 'character',
    text: 'JAGJIT',
  },
  {
    id: 'g-b23',
    type: 'dialogue',
    text: 'ਗੱਡੀ ਨੰਬਰ PB-02-AX-9912 GPS ਉੱਤੇ track ਹੋ ਗਈ ਹੈ। Tactical Team Bravo, block the northern exit immediately!',
  },
  {
    id: 'g-b24',
    type: 'action',
    text: 'The Scorpio suddenly screeches to an aggressive halt against the cobblestones. The rear passenger doors fly open. Two masked operatives wearing dark jackets leap out, clutching heavy metallic briefcases.',
  },
  {
    id: 'g-b25',
    type: 'character',
    text: 'SUSPECT (O.S.)',
  },
  {
    id: 'g-b26',
    type: 'dialogue',
    text: 'ਭੱਜੋ! ਪੁਲਿਸ ਆ ਗਈ ਹੈ! ਫਾਇਰਿੰਗ ਸ਼ੁਰੂ ਕਰੋ!',
  },
  {
    id: 'g-b27',
    type: 'action',
    text: 'ਗੋਲੀਆਂ ਚੱਲਣ ਦੀ ਤੇਜ਼ ਆਵਾਜ਼ ਨਾਲ ਸਵੇਰ ਦਾ ਸੰਨਾਟਾ ਟੁੱਟ ਜਾਂਦਾ ਹੈ। Sparks fly off the antique red-sandstone pillars of the heritage facade. Jagjit dives behind a reinforced concrete barrier, drawing his 9mm Glock service pistol.',
  },
  {
    id: 'g-b28',
    type: 'character',
    text: 'JAGJIT',
  },
  {
    id: 'g-b29',
    type: 'parenthetical',
    text: '(breathless, reloading magazine while taking cover)',
  },
  // Extended Punjabi Monologue with rich Gurmukhi conjuncts & stacked matras
  {
    id: 'g-b30',
    type: 'dialogue',
    text: 'ਵਾਹਿਗੁਰੂ ਮਿਹਰ ਕਰੇ। ਅਸੀਂ ਕਿਸੇ ਵੀ ਹਾਲਤ ਵਿੱਚ ਨਿਰਦੋਸ਼ ਸ਼ਹਿਰੀਆਂ ਦਾ ਨੁਕਸਾਨ ਨਹੀਂ ਹੋਣ ਦੇਵਾਂਗੇ। Every officer under my command knows the sacred oath of duty: "ਸਰਬੱਤ ਦਾ ਭਲਾ" ਅਤੇ ਨਿਆਂ ਦੀ ਅਟੁੱਟ ਰੱਖਿਆ। ਜਦੋਂ ਤੱਕ ਮੁਕੰਮਲ ਸੱਚਾਈ ਸਾਹਮਣੇ ਨਹੀਂ ਆਉਂਦੀ, ਮੇਰਾ ਹਰ ਇੱਕ ਸਾਹ ਇਸ ਪਵਿੱਤਰ ਧਰਤੀ ਦੇ ਅਮਨ-ਕਾਨੂੰਨ ਲਈ ਸਮਰਪਿਤ ਰਹੇਗਾ। ਕ੍ਰਿੱਪਾ ਰੱਖਿਓ ਸੱਚੇ ਪਾਤਸ਼ਾਹ, ਇਹ ਇਮਤਿਹਾਨ ਧਰਮ, ਇਮਾਨਦਾਰੀ ਅਤੇ ਸੱਚ ਦੀ ਪਰਖ ਦਾ ਹੈ। The evidence stored in that rugged metallic briefcase will either completely vindicate our entire department or expose the darkest network of institutional corruption this state has ever encountered.',
  },
  {
    id: 'g-b31',
    type: 'action',
    text: 'A deafening smoke grenade detonation echoes down the narrow lane. Thick white smoke billows into the air, obscuring visibility. Jagjit charges through the haze, his eyes locked on the escaping suspect silhouette.',
  },

  // Scene 4 - Climax inside Abandoned Textile Mill
  {
    id: 'g-b32',
    type: 'scene_heading',
    text: 'INT. ABANDONED TEXTILE MILL - CONTINUOUS',
  },
  {
    id: 'g-b33',
    type: 'action',
    text: 'Shafts of dusty dawn light cut through broken corrugated roof panels. Giant rusty iron looms stand like skeletal giants in the damp gloom. Water drips rhythmically from overhead pipes.',
  },
  {
    id: 'g-b34',
    type: 'character',
    text: 'JAGJIT',
  },
  {
    id: 'g-b35',
    type: 'dialogue',
    text: 'ਹਥਿਆਰ ਹੇਠਾਂ ਸੁੱਟ ਦਿਓ! You are surrounded by the Quick Reaction Team on all perimeter sides.',
  },
  {
    id: 'g-b36',
    type: 'character',
    text: 'SUSPECT',
  },
  {
    id: 'g-b37',
    type: 'dialogue',
    text: 'ਬਹੁਤ ਦੇਰ ਹੋ ਚੁੱਕੀ ਹੈ ਇੰਸਪੈਕਟਰ ਸਾਹਿਬ। The encrypted biometric file has already been uploaded to a secure Swiss cloud server.',
  },
  {
    id: 'g-b38',
    type: 'action',
    text: 'The suspect swiftly raises a compact submachine gun. Jagjit fires two precise shots. The weapon clatters against the greasy concrete floor. The suspect collapses heavily against an iron stanchion.',
  },
  {
    id: 'g-b39',
    type: 'action',
    text: 'ਜਗਜੀਤ ਹੌਲੀ-ਹੌਲੀ ਅੱਗੇ ਵਧਦਾ ਹੈ। The screen of the suspect\'s military-grade Toughbook glows with a completed status: \'Data Transfer 100% Successful\'. A faint, mocking smile lingers on the suspect\'s bloody lips as distant emergency sirens echo from the streets.',
  },
  {
    id: 'g-b40',
    type: 'transition',
    text: 'FADE OUT.',
  },
];

export function createGoldenDraft(overrides?: Partial<ScriptDraft>): ScriptDraft {
  return {
    id: 'golden-amritsar-files',
    name: 'ਅੰਮ੍ਰਿਤਸਰ ਫਾਈਲਜ਼ (Master Golden Script)',
    isMain: true,
    createdAt: '2026-11-06T00:00:00.000Z',
    modifiedAt: '2026-11-06T00:00:00.000Z',
    blocks: JSON.parse(JSON.stringify(GOLDEN_BLOCKS)),
    ...overrides,
  };
}
