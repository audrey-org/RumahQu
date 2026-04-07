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
  "Bahan sudah ada, tapi tetap kebeli lagi karena lupa stok di rumah.",
  "Sayur, susu, dan lauk sering telat dipakai sampai akhirnya terbuang.",
  "Belanja mingguan terasa capek karena semuanya harus diingat sendiri.",
];

const benefits = [
  {
    icon: Package,
    title: "Pantau stok dapur tanpa tebak-tebakan",
    description: "Lihat barang yang masih aman, yang hampir habis, dan yang perlu segera dipakai dalam satu tampilan rapi.",
  },
  {
    icon: BellRing,
    title: "Dapat pengingat sebelum bahan terbuang",
    description: "RumahQu bantu ingatkan bahan yang mendekati masa simpan supaya bisa diolah lebih dulu.",
  },
  {
    icon: ShoppingCart,
    title: "Belanja lebih tepat, bukan lebih banyak",
    description: "Buat daftar restock dari kebutuhan nyata di rumah, jadi belanja lebih hemat dan minim duplikasi.",
  },
  {
    icon: ChefHat,
    title: "Masak dari stok yang sudah ada",
    description: "Temukan ide masakan berdasarkan isi dapur, agar bahan cepat terpakai dan menu harian lebih gampang diputuskan.",
  },
  {
    icon: Users,
    title: "Keluarga bisa bantu tanpa bikin ribet",
    description: "Stok, daftar belanja, dan kebutuhan rumah bisa dipantau bersama dalam satu grup keluarga.",
  },
];

const steps = [
  {
    title: "Catat stok sekali, rumah lebih tenang setiap hari",
    description: "Masukkan bahan yang baru dibeli atau yang sudah tersedia di dapur dan kulkas.",
  },
  {
    title: "Pantau prioritas tanpa perlu ingat semuanya",
    description: "Lihat barang yang mendekati habis atau kedaluwarsa dari dashboard yang mudah dibaca.",
  },
  {
    title: "Belanja dan masak lebih yakin",
    description: "Gunakan daftar restock dan rekomendasi menu untuk mengambil keputusan lebih cepat.",
  },
];

const useCases = [
  {
    title: "Sebagai aplikasi inventory rumah tangga",
    description:
      "Catat stok makanan, minuman, bumbu, dan kebutuhan rumah agar semua isi dapur terlihat jelas tanpa perlu cek satu per satu.",
  },
  {
    title: "Sebagai aplikasi stok dapur harian",
    description:
      "Prioritaskan bahan yang harus dipakai lebih dulu, minimalkan makanan terbuang, dan rapikan keputusan masak setiap hari.",
  },
  {
    title: "Sebagai aplikasi daftar belanja keluarga",
    description:
      "Ubah kebutuhan restock menjadi daftar belanja yang bisa dipantau bersama, jadi belanja mingguan lebih hemat dan terarah.",
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
      "Ya. Halaman awal RumahQu mengarahkan pengguna untuk daftar gratis sehingga keluarga bisa mulai mencatat stok dan daftar belanja tanpa hambatan awal.",
  },
];

const Home = () => {
  const { user, loading } = useAuth();

  usePageMeta({
    title: "Kelola Stok Rumah Tanpa Bahan Terbuang",
    description:
      "RumahQu adalah aplikasi inventory rumah tangga untuk memantau stok dapur, menghindari belanja dobel, mengelola daftar belanja, dan memasak sebelum bahan terbuang.",
    canonicalPath: "/",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: APP_NAME,
        url: APP_SITE_URL,
        inLanguage: APP_LANGUAGE,
        description:
          "Aplikasi inventory rumah tangga untuk memantau stok dapur, belanja, dan masa simpan bahan keluarga.",
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
          "Aplikasi stok dapur dan inventaris rumah tangga untuk memantau bahan, masa simpan, rekomendasi masakan, dan daftar belanja keluarga.",
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
              Aplikasi inventory rumah tangga untuk dapur yang lebih terkendali
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Aplikasi stok dapur yang bantu keluarga belanja lebih tepat, masak lebih tenang, dan mengurangi bahan terbuang.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {APP_NAME} membantu Anda melihat stok rumah dengan jelas, tahu bahan mana yang harus dipakai dulu,
                mengelola daftar belanja keluarga, dan menyiapkan masakan dari bahan yang sudah tersedia.
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
                <p className="text-sm font-extrabold">Stok selalu jelas</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Tidak perlu bongkar dapur dulu hanya untuk tahu apa yang masih ada.</p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-extrabold">Belanja lebih hemat</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Prioritaskan restock yang benar-benar dibutuhkan rumah hari ini.</p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                <p className="text-sm font-extrabold">Masak lebih cepat</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Temukan ide menu dari bahan yang sudah tersedia di rumah.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%)] blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Ringkasan Rumah Hari Ini</p>
                  <h2 className="text-2xl font-extrabold">Dapur lebih rapi, keputusan lebih cepat</h2>
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
                      RumahQu menyorot bahan prioritas agar Anda bisa memasak sebelum terlambat.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="rounded-3xl shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-extrabold">Daftar restock otomatis</p>
                          <p className="text-sm text-muted-foreground">Belanja sesuai kebutuhan nyata.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <ChefHat className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-extrabold">Ide menu dari stok</p>
                          <p className="text-sm text-muted-foreground">Masak tanpa bingung mulai dari mana.</p>
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
                        <p className="font-extrabold">Satu rumah, satu catatan yang sama</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Pasangan dan anggota keluarga bisa ikut pantau stok dan daftar belanja tanpa saling miss komunikasi.
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
                Bukan karena Anda kurang teliti. Hanya saja semua urusan rumah menumpuk di kepala yang sama.
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
              RumahQu membantu Anda mengatur stok rumah, daftar belanja, dan keputusan masak dengan cara yang terasa ringan.
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
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Kenapa halaman ini relevan</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                Jika Anda mencari aplikasi inventory rumah tangga atau aplikasi stok dapur, RumahQu dirancang untuk kebutuhan itu.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                RumahQu menggabungkan pencatatan stok bahan makanan, pengingat masa simpan, daftar belanja rumah, dan rekomendasi menu
                dalam satu alur yang mudah dipakai keluarga di Indonesia. Fokusnya bukan sekadar mencatat barang, tetapi membantu rumah
                tangga belanja lebih hemat, mengurangi food waste, dan menjaga dapur tetap siap pakai setiap hari.
              </p>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="container max-w-6xl px-4 py-10 md:py-14">
          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(36_30%_100%))] p-6 md:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Cara kerja</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">Mulai dalam 3 langkah sederhana.</h2>
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
                  Saat stok rumah terlihat jelas, belanja jadi lebih hemat dan masak terasa jauh lebih ringan.
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-sm text-background/80">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <span>Pantau stok dan masa simpan dalam satu tempat.</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-background/80">
                    <ClipboardList className="mt-0.5 h-5 w-5 text-primary" />
                    <span>Siapkan daftar belanja yang benar-benar relevan.</span>
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
