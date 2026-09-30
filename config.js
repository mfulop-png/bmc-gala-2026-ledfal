/* Vendégérkeztetés beállításai – lásd supabase/README.md
   Ha a Supabase adatok üresek, a rendszer BEMUTATÓ MÓDBAN fut: a vendéglista csak az adott böngészőben
   él, és a LED fal csak ugyanazon a gépen, másik fülön nyitva kapja meg az üdvözléseket (teszteléshez). */
window.BMC_CONFIG = {
  supabaseUrl: '',          // pl. 'https://abcdefghijkl.supabase.co'  (Project Settings → API → Project URL)
  supabaseAnonKey: '',      // Project Settings → API → anon / publishable key (nyilvános kulcs, ide írható)
  hostessEmail: 'hostess@bmc-gala.hu',   // a közös hostess-fiók e-mail címe (Authentication → Users)
  demoPassword: 'demo'      // csak bemutató módban
};
