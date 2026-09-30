/* Vendégérkeztetés beállításai – lásd supabase/README.md
   Ha a Supabase adatok üresek, a rendszer BEMUTATÓ MÓDBAN fut: a vendéglista csak az adott böngészőben
   él, és a LED fal csak ugyanazon a gépen, másik fülön nyitva kapja meg az üdvözléseket (teszteléshez). */
window.BMC_CONFIG = {
  supabaseUrl: 'https://axtjmpjivhagvubvjvsp.supabase.co',   // Supabase: Deloitte org / „BMC Gala 2026” projekt
  supabaseAnonKey: 'sb_publishable_4AVkIUfdKPve-KXChbjpmA_E8nY8WrQ',   // publishable key (nyilvános kulcs, ide írható)
  hostessEmail: 'hostess@bmc-gala.hu',   // a közös hostess-fiók e-mail címe (Authentication → Users)
  demoPassword: 'demo'      // csak bemutató módban
};
