<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('blocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('layer_id')->constrained()->cascadeOnDelete();
                $table->json('object_id'); // Array of object IDs (if you want to store as JSON)
                $table->integer('width');
                $table->integer('height');
                $table->integer('anchor_x')->default(0);
                $table->integer('anchor_y')->default(0);
                $table->json('points')->nullable(); // Optional: for polygonal blocks
                $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocks');
    }
};
