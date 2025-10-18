import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "@/react-app/pages/Home";
import Step1Page from "@/react-app/pages/Step1";
import Step2Page from "@/react-app/pages/Step2";
import Step3Page from "@/react-app/pages/Step3";
import Step4Page from "@/react-app/pages/Step4";
import PreviewPage from "@/react-app/pages/Preview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new/step1" element={<Step1Page />} />
        <Route path="/new/step2/:projectId" element={<Step2Page />} />
        <Route path="/new/step3/:projectId" element={<Step3Page />} />
        <Route path="/new/step4/:projectId" element={<Step4Page />} />
        <Route path="/preview/:slug" element={<PreviewPage />} />
      </Routes>
    </Router>
  );
}
