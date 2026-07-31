// LoadingOverlay.jsx
import { useEffect, useState } from "react";
import Loading from "./Loading.jsx";

export default function LoadingOverlay() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false); // hide loader after 3 seconds
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return show ? <Loading /> : null;
}
