// Get DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// System prompt for the chatbot
const systemPrompt = `You are a helpful AI assistant for L'Oréal. Only answer questions about L'Oréal products, routines, recommendations, and beauty-related topics. If a question is not related to L'Oréal or beauty, politely refuse to answer.`;

// Show a welcome message
chatWindow.innerHTML = `<div class="msg ai">👋 Hello! Ask me about any L'Oréal product or routine.</div>`;

// Function to add a message to the chat window
function addMessage(text, sender = "ai") {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;
  msgDiv.innerHTML = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to call OpenAI API (using fetch, async/await)
async function getAIResponse(userMsg) {
  // Show loading message
  addMessage("<em>Thinking...</em>", "ai");

  // Prepare the API request

  // Use your Cloudflare Worker endpoint for all API requests
  const endpoint = "https://loreal-worker.crbuch.workers.dev";
  const headers = {
    "Content-Type": "application/json"
  };

  // Build the request body
  const body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg }
    ],
    max_tokens: 400,
    temperature: 0.7
  };

  try {
    // Make the API request
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    // Parse the response
    const data = await res.json();

    // Remove the loading message
    const loading = chatWindow.querySelector(".msg.ai em");
    if (loading) loading.parentElement.remove();

    // Check for error
    if (!res.ok || !data.choices) {
      addMessage("Sorry, I couldn't get a response. Please try again.", "ai");
      return;
    }

    // Get the AI's reply
    const aiReply = data.choices[0].message.content.trim();
    addMessage(aiReply, "ai");
  } catch (err) {
    // Remove the loading message
    const loading = chatWindow.querySelector(".msg.ai em");
    if (loading) loading.parentElement.remove();
    addMessage("Sorry, something went wrong. Please try again.", "ai");
  }
}

// Handle form submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userMsg = userInput.value.trim();
  if (!userMsg) return;

  // Add user's message to chat
  addMessage(`<strong>You:</strong> ${userMsg}`, "user");
  userInput.value = "";

  // Call OpenAI API for a response
  getAIResponse(userMsg);
});
