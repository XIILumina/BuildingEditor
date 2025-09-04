<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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

    // Editor route (renders EditorApp.jsx with BrowserRouter for nested UI)
    Route::get('/editor/{id}', fn($id) => Inertia::render('Editor/EditorApp', ['projectId' => $id]))->name('editor');

    // Project routes (use Inertia to render JSON-saved projects)
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index'); // List projects (Inertia render)
    Route::get('/projects/{id}', [ProjectController::class, 'show'])->name('projects.show'); // View project (Inertia render)
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store'); // Create project (JSON data)
    Route::put('/projects/{id}', [ProjectController::class, 'update'])->name('projects.update'); // Update project (JSON data)
});

require __DIR__.'/auth.php';