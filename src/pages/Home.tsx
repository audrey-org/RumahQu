import { ArrowRight, BellRing, ChefHat, CheckCircle2, ClipboardList, Package, ShoppingCart, Sparkles, Users } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  APP_LANGUAGE,
  APP_NAME,
  APP_SITE_URL,
  DEFAULT_LOGO_URL,
  DEFAULT_OG_IMAGE_URL,
} from "@/lib/brand";

const problems = [
  "Sudah belanja, lalu baru sadar bahan yang sama masih ada di rumah.",
  "Sayur, susu, dan lauk terlewat dipakai sampai akhirnya terbuang percuma.",
  "Belanja dan masak terasa melelahkan karena semua stok harus diingat sendiri.",
];

const benefits = [
  {
    icon: Package,
    title: "Lihat isi dapur dalam hitungan detik",
    description: "Cek stok rumah dari satu tampilan rapi tanpa perlu bongkar kulkas, rak, atau laci satu per satu.",
  },
  {
    icon: BellRing,
    title: "Pakai bahan sebelum terlambat",
    description: "RumahQu menandai bahan yang perlu diprioritaskan supaya lebih cepat dimasak, bukan telat disadari.",
  },
  {
    icon: ShoppingCart,
    title: "Belanja sesuai kebutuhan nyata",
    description: "Buat daftar restock dari stok yang benar-benar menipis agar belanja lebih hemat dan jauh dari pembelian dobel.",
  },
  {
    icon: ChefHat,
    title: "Ubah stok jadi ide menu",
    description: "Temukan rekomendasi masakan dari bahan yang sudah tersedia supaya keputusan makan harian terasa lebih gampang.",
  },
  {
    icon: Users,
    title: "Satu rumah lihat catatan yang sama",
    description: "Stok, daftar belanja, dan kebutuhan rumah bisa dipantau bersama agar komunikasi keluarga lebih rapi.",
  },
];

const steps = [
  {
    title: "Catat barang yang baru masuk",
    description: "Masukkan bahan yang baru dibeli atau stok yang sudah ada supaya isi rumah langsung tercatat rapi.",
  },
  {
    title: "Lihat apa yang harus dipakai lebih dulu",
    description: "Pantau bahan yang mendekati habis atau masa simpan dari dashboard yang mudah dibaca keluarga.",
  },
  {
    title: "Belanja dan masak tanpa banyak ragu",
    description: "Gunakan daftar restock dan ide menu untuk mengambil keputusan lebih cepat setiap hari.",
  },
];

const useCases = [
  {
    title: "Untuk keluarga yang ingin belanja lebih hemat",
    description:
      "Saat isi rumah terlihat jelas, Anda hanya membeli yang benar-benar dibutuhkan dan lebih tenang saat belanja mingguan.",
  },
  {
    title: "Untuk rumah yang ingin mengurangi bahan terbuang",
    description:
      "Prioritaskan bahan yang harus dipakai lebih dulu agar food waste berkurang dan stok rumah terasa lebih terkontrol.",
  },
  {
    title: "Untuk dapur yang ingin terasa lebih ringan diurus",
    description:
      "Masak, restock, dan koordinasi keluarga jadi lebih gampang karena semua informasi penting ada dalam satu aplikasi.",
  },
];

const faqs = [
  {
    question: "Apa itu RumahQu?",
    answer:
      "RumahQu adalah aplikasi inventory rumah tangga berbasis web untuk memantau stok dapur, masa simpan bahan, daftar belanja, dan kolaborasi keluarga dalam satu tempat.",
  },
  {
    question: "Siapa yang cocok menggunakan RumahQu?",
    answer:
      "RumahQu cocok untuk ibu rumah tangga, pasangan muda, keluarga kecil, dan siapa pun yang ingin mengatur stok bahan makanan serta belanja rumah dengan lebih rapi.",
  },
  {
    question: "Apa manfaat utama aplikasi stok dapur seperti RumahQu?",
    answer:
      "Manfaat utamanya adalah mengurangi belanja dobel, menekan bahan makanan terbuang, mempercepat keputusan memasak, dan memudahkan keluarga berbagi informasi stok.",
  },
  {
    question: "Apakah RumahQu bisa dipakai gratis?",
    answer:
      "Ya. RumahQu bisa dipakai gratis untuk mulai mencatat stok, memantau bahan yang perlu dipakai dulu, dan membuat daftar belanja keluarga.",
  },
];

const Home = () => {
  const { user, loading } = useAuth();

  usePageMeta({
    title: "Aplikasi Gratis untuk Stok Dapur & Belanja Keluarga",
    description:
      "RumahQu adalah aplikasi gratis untuk cek stok dapur, pantau masa simpan, buat daftar belanja, dan temukan ide masak dari bahan yang sudah ada di rumah.",
    canonicalPath: "/",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: APP_NAME,
        url: APP_SITE_URL,
        inLanguage: APP_LANGUAGE,
        description:
          "Aplikasi gratis untuk memantau stok dapur, belanja, dan masa simpan bahan keluarga.",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: APP_NAME,
        url: APP_SITE_URL,
        logo: DEFAULT_LOGO_URL,
        image: DEFAULT_OG_IMAGE_URL,
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: APP_NAME,
        url: APP_SITE_URL,
        image: DEFAULT_OG_IMAGE_URL,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: APP_LANGUAGE,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "IDR",
        },
        description:
          "Aplikasi gratis untuk memantau stok bahan, masa simpan, rekomendasi masakan, dan daftar belanja keluarga.",
        featureList: [
          "Pantau stok dapur dan inventaris rumah tangga",
          "Pengingat bahan yang mendekati masa simpan",
          "Daftar belanja keluarga yang bisa dibagikan",
          "Rekomendasi masakan dari bahan yang tersedia",
        ],
      },
    ],
  });

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Memuat...</div>;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_32%),linear-gradient(180deg,hsl(36_33%_98%),hsl(36_33%_95%))] text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary p-2.5 shadow-[0_16px_40px_hsl(var(--primary)/0.25)]">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-extrabold">{APP_NAME}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Smart home inventory</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#fitur" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Fitur
            </a>
            <a href="#cara-kerja" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Cara Kerja
            </a>
            <a href="#faq" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/auth?tab=login">Masuk</Link>
            </Button>
            <Button asChild className="rounded-full px-5 font-bold shadow-[0_16px_32px_hsl(var(--primary)/0.28)]">
              <Link to="/auth?tab=register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="space-y-7">
            <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-bold text-primary hover:bg-primary/10">
              Gratis dipakai untuk keluarga yang ingin stok rumah lebih rapi
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Cek stok dapur, hindari belanja dobel, dan pakai bahan sebelum terbuang. Gratis.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {APP_NAME} membantu keluarga melihat isi rumah dengan jelas, tahu bahan mana yang harus dipakai dulu,
                membuat daftar belanja dari kebutuhan nyata, dan menemukan ide masak dari stok yang sudah ada.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-8 text-base font-extrabold shadow-[0_18px_40px_hsl(var(--primary)/0.3)]">
                <Link to="/auth?tab=register">
                  Daftar Gratis
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-primary/20 bg-background/70 px-8 text-base font-bold">
                <Link to="/auth?tab=login">Masuk Sekarang</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-extrabold">100% gratis dipakai</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Mulai atur stok rumah sekarang tanpa biaya di awal.</p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-extrabold">Belanja lebih hemat</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Restock berdasarkan kebutuhan rumah, bukan perkiraan atau lupa.</p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-extrabold">Rumah lebih tenang</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Satu keluarga bisa lihat stok dan daftar belanja yang sama.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%)] blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Ringkasan Rumah Hari Ini</p>
                  <h2 className="text-2xl font-extrabold">Semua yang perlu Anda tahu, langsung kelihatan</h2>
                </div>
                <Sparkles className="h-6 w-6 text-primary" />
              </div>

              <div className="grid gap-4">
                <Card className="rounded-3xl border-primary/15 bg-primary/5 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Perlu dipakai dulu</p>
                        <p className="mt-1 text-xl font-extrabold">Susu UHT, sawi, telur</p>
                      </div>
                      <BellRing className="h-9 w-9 text-primary" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      RumahQu menyorot bahan prioritas agar Anda bisa cepat memutuskan apa yang harus dimasak hari ini.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="rounded-3xl shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-extrabold">Daftar restock yang lebih masuk akal</p>
                          <p className="text-sm text-muted-foreground">Belanja hanya yang memang perlu dibeli.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <ChefHat className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-extrabold">Ide menu dari stok yang ada</p>
                          <p className="text-sm text-muted-foreground">Masak lebih cepat tanpa bingung mulai dari mana.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-3xl border-border/60 bg-secondary/60 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Users className="mt-1 h-8 w-8 text-primary" />
                      <div>
                        <p className="font-extrabold">Satu rumah, satu sumber informasi</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Pasangan dan anggota keluarga bisa ikut pantau stok dan daftar belanja tanpa saling tanya berulang.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-8 md:py-12">
          <div className="rounded-[2rem] border border-border/60 bg-card/85 p-6 shadow-sm md:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Masalah yang sering terjadi di rumah</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                Bukan karena Anda kurang teliti. Masalahnya, semua stok rumah selama ini cuma disimpan di kepala.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {problems.map((problem) => (
                <div key={problem} className="rounded-3xl border border-border/60 bg-background/90 p-5">
                  <p className="text-base font-bold leading-7">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {useCases.map((useCase) => (
              <article key={useCase.title} className="rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-sm">
                <h2 className="text-xl font-extrabold leading-snug">{useCase.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{useCase.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="fitur" className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Yang Anda dapatkan</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">
              RumahQu membantu rumah tangga terasa lebih rapi, lebih hemat, dan jauh lebih mudah dijalankan.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.title} className="rounded-[1.75rem] border border-border/60 bg-card/90 p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-extrabold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="rounded-[2rem] border border-border/60 bg-card/85 p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Kenapa mulai dari sekarang</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                Mulai dari aplikasi gratis yang langsung membantu, bukan menambah pekerjaan baru.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                RumahQu dibuat untuk keluarga yang ingin isi rumah lebih mudah dipantau tanpa spreadsheet, catatan tercecer, atau tebakan.
                Begitu stok rumah terlihat jelas, Anda bisa lebih cepat memutuskan apa yang perlu dibeli, apa yang harus dimasak, dan apa
                yang sebaiknya dipakai lebih dulu.
              </p>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(36_30%_100%))] p-6 md:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Cara kerja</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">Mulai pakai dalam 3 langkah sederhana.</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">Pertanyaan yang sering muncul sebelum mulai memakai RumahQu.</h2>
          </div>
          <div className="mt-8 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.75rem] border border-border/60 bg-card/90 p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container max-w-6xl px-4 pb-16 pt-6 md:pb-24">
          <div className="rounded-[2rem] bg-foreground px-6 py-8 text-background shadow-[0_30px_80px_rgba(15,23,42,0.18)] md:px-10 md:py-10">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary/80">Siap mulai?</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                  Coba gratis hari ini, lalu rasakan sendiri betapa enaknya saat stok rumah selalu jelas.
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-sm text-background/80">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <span>Pantau stok dan masa simpan dalam satu tempat.</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-background/80">
                    <ClipboardList className="mt-0.5 h-5 w-5 text-primary" />
                    <span>Mulai gratis untuk belanja yang lebih terarah.</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button asChild size="lg" className="rounded-full px-8 text-base font-extrabold">
                  <Link to="/auth?tab=register">Daftar Gratis</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="rounded-full px-8 text-base font-extrabold">
                  <Link to="/auth?tab=login">Saya Sudah Punya Akun</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
