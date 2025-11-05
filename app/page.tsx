"use client";

import Link from "next/link";

const page = () => {
  return (
    <div className="w-full min-h-screen flex justify-center bg-black px-4 py-20">
      <div className="w-full h-full max-w-4xl flex flex-col gap-4">
        <h1>Tuss</h1>
        <p>
          Ansona banda — riktīgi dranduļeti, kas sēž savā šķūnī un grauž sēklas
          kā naglas. Gatavdirša silda bārdas vietu ar “Straumēniem” fonā un
          kliedz: “Šovakar mēs ieņemsim Roberta tusu!” Visi bļauj “JĀĀĀ!” tā, ka
          griesti trīc un vecā veļasmašīna sāk pīkstēt Morse kodā “idioti”.
        </p>

        <p>
          Petenkoferis uz Maximas čeka zīmē plānu ar izžuvušu flomāsteri: “No
          šejienes līdz tusam — divas miskastes un viens suns.” Kartosmirdis
          skaita enerģijas dzērienus kā patronas. “Ja nebūs Red Bulla, ejam ar
          Cido,” viņš saka, un visi smejas kā gooni, kas atraduši bezmaksas
          Wi-Fi.
        </p>

        <p>
          Pa to laiku Roberts ar savu “Kebabox” grupu vāras kā tējkanna. “Tie
          ansoniešu petenkoferi! Domā, tiks uz manu tusu? Nah, mēs viņiem hatu
          pārvērtīsim par kebabu!” Čīkstulavs sit dūri galdā: “Norullēsim
          tapetes, sasitīsim traukus un uzrakstīsim uz sienas ‘Gatavdirša bija
          te’ — ar marķieri no elles.”
        </p>

        <p>
          Roberts bļauj: “Viņi nāks ar čipsiem, mēs — ar haosu!” Saldskudra jau
          uzvelk darba cimdus, it kā dotos demolēt Mēness bāzi. Visi deg kā
          svecītes degvielā — karš par tusu, ne par slavu. Divas bandas, viena
          nakts, un pēdējais, kas dabūs Cēsu ķirsīti, kļūs par zelta depozītu
          pavēlnieku.
        </p>

        <Link href="/game" className="text-lg underline">
          Sakt speli
        </Link>
      </div>
    </div>
  );
};

export default page;
