<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class EditController extends Controller
{
    public function index()
    {
        return Inertia::render('Editor/Editor');
    }
}
