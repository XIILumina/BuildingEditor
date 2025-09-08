import React, { useState, useEffect } from "react";
import { usePage, Link as InertiaLink } from "@inertiajs/react";
import axios from "axios";
import Template from "./Template";
import Toolbar from "./Toolbar";
import FileMenu from "./FileMenu";
import Sidepanel from "./Sidepanel/Sidepanel";

function Editor({ projectId }) {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };

  // Editor states
  const [tool, setTool] = useState("select");
  const [lines, setLines] = useState([]);
  const [sidepanelMode, setSidepanelMode] = useState("properties");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [thickness, setThickness] = useState(6);
  const [material, setMaterial] = useState("Brick");
  const [gridSize, setGridSize] = useState(20);
  const [units, setUnits] = useState("Metric");

  useEffect(() => {
    // load project (best-effort)
    axios.get(`/projects/${projectId}`)
      .then((res) => {
        const data = res.data?.project?.data || {};
        if (data.lines) setLines(data.lines);
        if (data.gridSize) setGridSize(data.gridSize);
        if (data.units) setUnits(data.units);
        if (data.drawColor) setDrawColor(data.drawColor);
        if (data.thickness) setThickness(data.thickness);
        if (data.material) setMaterial(data.material);
      })
      .catch(() => {
        // ignore for now — we'll add robust loading later
      });
  }, [projectId]);

  return (
    <div className="relative h-screen w-screen bg-[#071021] text-white overflow-hidden">
      {/* top navbar (fixed height) */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-gradient-to-b from-[#07101b]/95 to-[#071426]/90 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <FileMenu projectId={projectId} lines={lines} />
          <InertiaLink href="/" className="font-bold text-lg">Blueprint App</InertiaLink>
        </div>

        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] text-black font-semibold">
            Editor — Project #{projectId}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Toolbar
            tool={tool}
            setTool={setTool}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
            thickness={thickness}
            setThickness={setThickness}
          />
        </div>
      </div>

      {/* main area below navbar */}
      <div className="absolute top-14 left-0 right-0 bottom-0 flex">
        {/* left: canvas */}
        <div className="flex-1 relative z-0">
          {/* Template will fit this container */}
          <Template
            tool={tool}
            lines={lines}
            setLines={setLines}
            drawColor={drawColor}
            thickness={thickness}
            gridSize={gridSize}
            units={units}
          />
        </div>

        {/* right: sidepanel (inline, not absolute) */}
        <div className="w-80 z-30 border-l border-gray-800">
          <Sidepanel
            sidepanelMode={sidepanelMode}
            setSidepanelMode={setSidepanelMode}
            projectId={projectId}
            // pass settings setters and state
            thickness={thickness}
            setThickness={setThickness}
            material={material}
            setMaterial={setMaterial}
            gridSize={gridSize}
            setGridSize={setGridSize}
            units={units}
            setUnits={setUnits}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
          />
        </div>
      </div>
    </div>
  );
}

export default Editor;
