<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use OpenAI;

class OpenAIController extends Controller
{
    public function chat(Request $request)
    {
        $client = OpenAI::client(env('OPENAI_API_KEY'));

        // Split the prompt into 500-character chunks
        $prompt = $request->input('prompt');
        $promptBlocks = str_split($prompt, 500);

        // Build the messages array
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are GPT Assistant'
            ]
        ];
        //

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
