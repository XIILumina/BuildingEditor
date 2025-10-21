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
        Schema::create('shapes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('layer_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // rect/circle/etc
            $table->integer('x')->default(0);
            $table->integer('y')->default(0);
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->integer('radius')->nullable();
            $table->integer('rotation')->default(0);
            $table->string('color')->default('#9CA3AF');
            $table->json('points')->nullable();
            $table->integer('radiusX')->nullable();
            $table->integer('radiusY')->nullable();
            $table->string('fill')->nullable();
            $table->string('stroke')->nullable();
            $table->integer('strokeWidth')->nullable();
            $table->boolean('closed')->nullable();
            $table->text('data')->nullable();
            $table->unsignedBigInteger('block_id')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shapes');
    }
};