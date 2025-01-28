export const BackgroundWave = () => {
  return (
    <div
      style={{
        backgroundImage: "url('/Websitebackground-BW.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        top: "74px", // Start after navbar
      }}
      className="fixed bottom-0 w-full h-[calc(100%-64px)] z-[-1] grayscale pointer-events-none"
    />
  );
};