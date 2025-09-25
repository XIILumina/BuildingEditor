<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use OpenAI;

class OpenAIController extends Controller
{
    public function chat(Request $request)
    {
        $client = OpenAI::client(env('OPENAI_API_KEY'));

        // Split the prompt into 300-character chunks
        $prompt = $request->input('prompt');
        $promptBlocks = str_split($prompt, 300);

        // Build the messages array
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a helpful assistant. You help users with their building editor tasks, they might give you instructions like "create a red rectangle" or "add a new layer" or "make the circle bigger". Keep your answers short and to the point. Also they can give you code blocks with JSON data, you should make suggestions and improvements to that data if they ask for it. Pretty please :), and be silly sometimes. Also they might send you the json code in smaller packages for you to analyse, if possible combine them together and analyse as they are one whole. If they ask for code, give it to them in a code block with the language specified as json. Do not make up any new features, only work with what you know is already implemented.'
            ]
        ];

        // Add each prompt block as a user message
        foreach ($promptBlocks as $block) {
            $messages[] = [
                'role' => 'user',
                'content' => $block,
            ];
        }

        try {
            $response = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => $messages,
            ]);

            return response()->json([
                'reply' => $response->choices[0]->message->content,
            ]);
        } catch (\Throwable $e) {
            \Log::error("OpenAI error: " . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    public function promptblock(Request $request) {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);
        $promptblock = $request->input('prompt');
        $promptblock = str_split($promptblock, 500);
        return response()->json(['promptblock' => $promptblock]);

    }
    public function Aidrawsuggestion(Request $request) {
        
    }
}
