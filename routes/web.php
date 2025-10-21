<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\OpenAIController;
use App\Http\Controllers\EditController;
use App\Http\Controllers\AnchorBlockController;
use App\Http\Controllers\LayersController;
use App\Http\Controllers\ShapesController;
use App\Http\Controllers\StrokesController;
use App\Http\Controllers\ErasersController;
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

    Route::post('/editor/anchor-block/anchor', [AnchorBlockController::class, 'anchor']);
    Route::post('/editor/anchor-block/unanchor/{id}', [AnchorBlockController::class, 'unanchor']);
    Route::put('/editor/anchor-block/{id}', [AnchorBlockController::class, 'update']);
    Route::delete('/editor/anchor-block/{id}', [AnchorBlockController::class, 'destroy']);


    Route::post('/openai/chat', [OpenAIController::class, 'chat']);
    Route::post('/openai/promptblock', [OpenAIController::class, 'promptblock']);
    Route::post('/openai/aidrawsuggestion', [OpenAIController::class, 'AiDrawSuggestion']);
    
Route::middleware(['auth'])->group(function () {
    // Projects CRUD
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    // Bulk save editor data (strokes/shapes/erasers/layers)
    Route::post('/projects/{project}/save', [ProjectController::class, 'bulkSave']);

    // Layers CRUD (scoped to a project)
    Route::get('/projects/{project}/layers', [LayersController::class, 'index']);
    Route::post('/projects/{project}/layers', [LayersController::class, 'store']);
    Route::put('/projects/{project}/layers/{layer}', [LayersController::class, 'update']);
    Route::delete('/projects/{project}/layers/{layer}', [LayersController::class, 'destroy']);

    // Strokes CRUD
    Route::get('/projects/{project}/strokes', [StrokesController::class, 'index']);
    Route::post('/projects/{project}/strokes', [StrokesController::class, 'store']);
    Route::put('/projects/{project}/strokes/{stroke}', [StrokesController::class, 'update']);
    Route::delete('/projects/{project}/strokes/{stroke}', [StrokesController::class, 'destroy']);

    // Shapes CRUD
    Route::get('/projects/{project}/shapes', [ShapesController::class, 'index']);
    Route::post('/projects/{project}/shapes', [ShapesController::class, 'store']);
    Route::put('/projects/{project}/shapes/{shape}', [ShapesController::class, 'update']);
    Route::delete('/projects/{project}/shapes/{shape}', [ShapesController::class, 'destroy']);

    // Erasers CRUD
    Route::get('/projects/{project}/erasers', [ErasersController::class, 'index']);
    Route::post('/projects/{project}/erasers', [ErasersController::class, 'store']);
    Route::put('/projects/{project}/erasers/{eraser}', [ErasersController::class, 'update']);
    Route::delete('/projects/{project}/erasers/{eraser}', [ErasersController::class, 'destroy']);
});
});


require __DIR__.'/auth.php';