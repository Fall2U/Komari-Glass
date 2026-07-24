"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomePage } from "@/components/HomePage";
import { InstancePage } from "@/components/instance/InstancePage";
import { Loading } from "@/components/Loading";
import { useApp } from "@/contexts/AppProvider";

export function AppShell() {
  const { loading, route, goHome } = useApp();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        {loading && route.name === "home" ? (
          <Loading />
        ) : route.name === "home" ? (
          <HomePage />
        ) : route.name === "instance" ? (
          <InstancePage uuid={route.uuid} />
        ) : (
          <div className="glass-panel mx-auto max-w-md rounded-lg p-8 text-center">
            <p className="mb-2 text-lg font-semibold">页面不存在</p>
            <button type="button" className="btn-primary" onClick={goHome}>
              返回首页
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
