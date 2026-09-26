import React from "react";
import { useReveals } from "./motion";
import { Nav, Hero } from "./sections/Hero";
import { Ask } from "./sections/Ask";
import { Demo } from "./sections/Demo";
import { Mirroring, How, Build, Film, Skills, Safety } from "./sections/Story";
import { Tools, Setup, Outro, Footer } from "./sections/Reference";

export const App: React.FC = () => {
  useReveals();
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ask />
        <Demo />
        <Mirroring />
        <How />
        <Build />
        <Tools />
        <Skills />
        <Safety />
        <Film />
        <Setup />
        <Outro />
      </main>
      <Footer />
    </>
  );
};
