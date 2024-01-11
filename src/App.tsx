import {Sidebar} from "./components/Sidebar/Sidebar";
import {useState} from "react";
import {ToastContainer, toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarWidth = "428px";
  const nav = document.querySelector("nav") as HTMLElement;
  const docs = document.querySelector("#docs-chrome") as HTMLElement;
  if (nav) {
    nav.style.marginRight = collapsed ? "40px" : sidebarWidth;
  }
  if (docs) {
    const docContainer = document.querySelector(
      ".kix-appview-editor-container"
    ) as HTMLElement;
    docContainer.style.width = "calc(100% - 428px)";
    docContainer.style.width = collapsed ? "" : "calc(100% - 428px)";
  }
  document.body.style.marginRight = collapsed ? "40px" : sidebarWidth;

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  return (
    <div>
      <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
      <ToastContainer
        position="bottom-right"
        theme="dark"
        style={{zIndex: 999999}}
      />
    </div>
  );
}

export default App;
