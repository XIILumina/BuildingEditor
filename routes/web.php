<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');
Route::view('/dashboard', 'welcome'); // Replace 'welcome' with your dashboard view if exists
Route::view('/editor/{projectId}', 'welcome'); // Replace 'welcome' with your editor view if exists
