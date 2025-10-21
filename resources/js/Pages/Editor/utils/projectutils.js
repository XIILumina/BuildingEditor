import axios from 'axios';

const saveInProgress = { current: false };

export async function saveProject(projectId, projectData, setSaveState) {
  if (!projectId || saveInProgress.current) return;
  saveInProgress.current = true;
  setSaveState('saving');
  try {
    await axios.post(`/projects/${projectId}/save`, { data: projectData });
    setSaveState('saved');
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed.");
    setSaveState('unsaved');
  } finally {
    saveInProgress.current = false;
  }
}

export function loadProject(projectId, setters) {
  if (!projectId) return;
  axios.get(`/projects/${projectId}`)
    .then((res) => {
      const project = res.data?.project;
      if (!project) return;
      const data = project.data || {};
      if (data.strokes) setters.setStrokes(data.strokes);
      if (data.erasers) setters.setErasers(data.erasers);
      if (data.shapes) setters.setShapes(data.shapes);
      if (data.gridSize) setters.setGridSize(data.gridSize);
      if (data.units) setters.setUnits(data.units);
      if (data.drawColor) setters.setDrawColor(data.drawColor);
      if (data.thickness) setters.setThickness(data.thickness);
      if (data.material) setters.setMaterial(data.material);
      if (project.name) setters.setProjectName(project.name);
      if (project.layers && project.layers.length > 0) {
        setters.setLayers(project.layers);
        setters.setActiveLayerId(project.layers[0].id);
      }
    })
    .catch((err) => {
      console.error("Failed to load project:", err);
    });
}