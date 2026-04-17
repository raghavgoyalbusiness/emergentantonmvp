import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const Meteors = ({ number = 30, className }) => {
  const [meteorStyles, setMeteorStyles] = useState([]);

  useEffect(() => {
    const styles = [...Array(number)].map(() => ({
      top: "-2%",
      left: Math.floor(Math.random() * 100) + "%",
      animationDelay: (Math.random() * 10).toFixed(2) + "s",
      animationDuration: (Math.random() * 5 + 4).toFixed(2) + "s",
      width: (Math.random() * 100 + 80) + "px",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[1] overflow-hidden",
        className
      )}
    >
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className="meteor absolute h-[2px] rounded-full rotate-[215deg]"
          style={{
            top: style.top,
            left: style.left,
            width: style.width,
            animationDelay: style.animationDelay,
            animationDuration: style.animationDuration,
            background:
              "linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0))",
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.35), 0 0 20px 4px rgba(130,210,255,0.2)",
          }}
        />
      ))}
    </div>
  );
};

export default Meteors;
