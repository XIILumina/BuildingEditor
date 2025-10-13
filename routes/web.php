<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\OpenAIController;
use App\Http\Controllers\EditController;
use App\Http\Controllers\AnchorBlockController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* inertia rendere veselu komponentu ar Inertia:render funkciju */
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('home');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');




Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    


    Route::get('/editor/{id}', fn($id) => Inertia::render('Editor/EditorApp', ['projectId' => $id]))->name('editor');
    Route::get('/edit', [EditController::class, 'index'])->name('edit.index');
    Route::post('/editor/anchor-block/store', [AnchorBlockController::class, 'store']);
    Route::put('/editor/anchor-block/{id}', [AnchorBlockController::class, 'update']);
    Route::delete('/editor/anchor-block/{id}', [AnchorBlockController::class, 'destroy']);


    Route::post('/openai/chat', [OpenAIController::class, 'chat']);
    Route::post('/openai/promptblock', [OpenAIController::class, 'promptblock']);
    Route::post('/openai/aidrawsuggestion', [OpenAIController::class, 'AiDrawSuggestion']);
    
Route::middleware(['auth'])->group(function () {
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::post('/projects/{project}/save', [ProjectController::class, 'save']);
    Route::put('/projects/{project}/name', [ProjectController::class, 'updateName']);
    Route::get('/projects/{project}/export', [ProjectController::class, 'exportJson']);
    Route::get('/projects/{project}/export-png', [ProjectController::class, 'exportPng']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::post('/projects/{project}/duplicate', [ProjectController::class, 'duplicate']);


    
    Route::post('/projects/{project}/layers', [ProjectController::class, 'addLayer']);
});
});


require __DIR__.'/auth.php';