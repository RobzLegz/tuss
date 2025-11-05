"use client";

import Link from "next/link";

const page = () => {
  return (
    <div className="w-full min-h-screen flex justify-center bg-black px-4 py-20">
      <div className="w-full h-full max-w-4xl flex flex-col gap-4">
        <h1>Tuss</h1>
        <p>
          Ansona banda — riktīgi dranduļeti, kas sēž savā šķūnī un grauž naglas
          kā sēklas. Gatavdirša silda bārdas vietu ar “Smiling friends” fonā un
          kliedz: “Šovakar mēs ieņemsim Roberta tusu!” Visi bļauj “JĀĀĀ!” tā, ka
          griesti trīc un vecā veļasmašīna sāk pīkstēt Morse kodā “idioti”.
        </p>

        <p>
          Petenkoferis uz Maximas čeka zīmē plānu ar izžuvušu flomāsteri: “No
          šejienes līdz tusam — divas miskastes un viens suns.” Kartosmirdis
          skaita enerģijas dzērienus kā patronas. “Ja nebūs Red Bulla, ejam ar
          spermas zeķi,” viņš saka, un visi smejas kā gooni, kas atraduši
          bezmaksas Wi-Fi.
        </p>

        <p>
          Pa to laiku Roberts ar savu “Kebabox” grupu vāras kā tējkanna. “Tie
          Ansona peteņkoferi! Domā, tiks uz manu tusu? Nah, mēs viņiem hatu
          pārvērtīsim par kebabu!” Bigdars sit dūri galdā: “Norullēsim tapetes,
          sasitīsim traukus un noriekstosim viņa sienas.”
        </p>

        <p>
          Roberts bļauj: “Viņi nāks ar čipsiem, mēs — ar pimpi!” Glutors jau
          uzvelk darba cimdus, it kā dotos uz cehu. Visi deg kā pīzdābols
          degvielā — karš par tusu, ne par slavu, tas nav tev ar pimpi bumbierus
          dauzīt. Divas bandas, viena nakts, un pēdējais, kas dabūs Cēsu
          ķirsīti, kļūs par zelta depozītu pavēlnieku.
        </p>

        <Link href="/home" className="text-lg underline">
          Sakt speli
        </Link>
      </div>
    </div>
  );
};

export default page;
