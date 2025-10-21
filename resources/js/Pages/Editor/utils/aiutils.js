import axios from 'axios';

let aiRequestInProgress = false;

export async function askAI(prompt) {
  if (aiRequestInProgress) return { success: false, data: "Request already in progress" };
  aiRequestInProgress = true;
  try {
    const res = await axios.post('/openai/chat', { prompt });
    return { success: true, data: res.data.reply };
  } catch (err) {
    console.error("OpenAI error:", err);
    return { success: false, data: "AI request failed: " + err.message };
  } finally {
    aiRequestInProgress = false;
  }
}

export async function askAIDraw(prompt, projectData) {
  if (aiRequestInProgress) return { success: false, data: "Request already in progress" };
  aiRequestInProgress = true;
  try {
    const res = await axios.post('/openai/aidrawsuggestion', {
      prompt,
      projectData: JSON.stringify(projectData),
    });
    return res.data;
  } catch (err) {
    console.error("OpenAI draw error:", err);
    return { success: false, data: "AI draw request failed: " + err.message };
  } finally {
    aiRequestInProgress = false;
  }
}