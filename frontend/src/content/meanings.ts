/**
 * "Kahulugan": a short, child-friendly meaning for every lesson word. Written so it reads after
 * "ang": "bata: maliit na tao" and "Kapag pinagsama, ba-ta ay bata, ang maliit na tao."
 * Draft until a teacher reviews it, like the rest of the lesson content.
 */
export const MEANINGS: Readonly<Record<string, string>> = {
  // Mm Aa Ss Ii Oo
  ama: "tatay",
  asa: "pag-asa na may magandang mangyayari",
  isa: "bilang na 1",
  mama: "tawag sa nanay o sa lalaking nakatatanda",
  masa: "malambot na halo ng harina at tubig",
  misa: "pagtitipon sa simbahan para magdasal",
  sama: "pagiging magkasama",
  mais: "dilaw na butil na masarap pakuluan o ihawin",
  aso: "hayop na tumatahol",
  // Bb Ee Uu
  baso: "lalagyan ng inumin",
  mesa: "patag na bagay na pinagpapatungan ng pagkain at gamit",
  ubas: "maliliit na bilog na prutas na magkakadikit",
  ube: "lilang ugat na ginagawang panghimagas",
  abo: "pinong pulbos na natitira pagkatapos masunog ang kahoy",
  sabi: "mga salitang sinasabi ng tao",
  // Tt Kk Ll Yy
  mata: "ginagamit natin sa pagtingin",
  bata: "maliit na tao",
  kama: "higaan",
  lima: "bilang na 5",
  mali: "hindi tama",
  bola: "bilog na laruan na pinapagulong at sinisipa",
  tasa: "lalagyan ng mainit na inumin",
  yaya: "taong nag-aalaga ng bata",
  yelo: "tubig na naging matigas at malamig",
  // Nn Gg Pp Rr Dd Hh Ww
  ina: "nanay",
  ibon: "hayop na may pakpak at lumilipad",
  pusa: "hayop na ngumingiyaw",
  pato: "ibong lumalangoy at kumakwak",
  puso: "bahaging tumitibok sa loob ng dibdib",
  dila: "bahagi ng bibig na ginagamit sa pagtikim",
  araw: "bituing nagbibigay ng liwanag at init",
  ilaw: "nagbibigay ng liwanag sa dilim",
  bahay: "tirahan ng pamilya",
  gatas: "puting inumin mula sa baka",
  // Mga Bilang
  dalawa: "bilang na 2",
  tatlo: "bilang na 3",
  apat: "bilang na 4",
  anim: "bilang na 6",
  pito: "bilang na 7",
  walo: "bilang na 8",
  siyam: "bilang na 9",
  sampu: "bilang na 10",
  // Mga Hayop
  isda: "hayop na lumalangoy sa tubig",
  baka: "hayop na nagbibigay ng gatas",
  kabayo: "hayop na mabilis tumakbo at maaaring sakyan",
  manok: "ibong nangingitlog at tumitilaok",
  // Pamilya
  nanay: "ina",
  tatay: "ama",
  ate: "nakatatandang kapatid na babae",
  kuya: "nakatatandang kapatid na lalaki",
  lola: "nanay ng iyong nanay o tatay",
  lolo: "tatay ng iyong nanay o tatay",
  // Katawan
  ilong: "ginagamit natin sa pag-amoy",
  bibig: "ginagamit natin sa pagkain at pagsasalita",
  tenga: "ginagamit natin sa pakikinig",
  kamay: "ginagamit natin sa paghawak",
  paa: "ginagamit natin sa paglakad",
  // Pagkain at Inumin
  saging: "dilaw na prutas na matamis",
  mansanas: "bilog na prutas na madalas pula",
  mangga: "matamis na prutas na dilaw kapag hinog",
  tubig: "malinaw na inumin na walang kulay",
  kanin: "nilutong bigas",
  tinapay: "pagkaing gawa sa harina na inihurno",
  // Mga Kulay
  pula: "kulay ng hinog na kamatis",
  asul: "kulay ng malinaw na langit",
  dilaw: "kulay ng hinog na saging",
  berde: "kulay ng dahon",
  puti: "kulay ng gatas",
  itim: "kulay ng gabi",
  kahel: "kulay ng dalandan",
  // Kalikasan
  buwan: "nagbibigay ng liwanag sa langit tuwing gabi",
  bituin: "kumikislap na ilaw sa langit tuwing gabi",
  puno: "malaking halaman na may katawang kahoy at mga sanga",
  dahon: "luntiang bahagi ng halaman",
  bulaklak: "makulay na bahagi ng halaman na mabango",
  // Magagalang na Salita
  salamat: "salitang sinasabi kapag may nagbigay o tumulong",
  po: "salitang magalang",
  opo: 'magalang na "oo"',
  "magandang umaga": "pagbati sa umaga",
  // Mga Bagay
  libro: "may mga pahinang binabasa",
  lapis: "ginagamit natin sa pagsusulat at pagguhit",
  papel: "pinagsusulatan at pinagguguhitan",
};

/** "bata: maliit na tao", or null when a word has no meaning written yet. */
export function meaningLine(word: string): string | null {
  const meaning = MEANINGS[word.toLowerCase()];
  return meaning ? `${word.toLowerCase()}: ${meaning}` : null;
}
