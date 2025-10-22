<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('shapes', function (Blueprint $table) {
            if (!Schema::hasColumn('shapes', 'radiusX')) $table->integer('radiusX')->nullable()->after('radius');
            if (!Schema::hasColumn('shapes', 'radiusY')) $table->integer('radiusY')->nullable()->after('radiusX');
            if (!Schema::hasColumn('shapes', 'points'))  $table->json('points')->nullable()->after('radiusY');
            if (!Schema::hasColumn('shapes', 'fill'))    $table->string('fill', 8)->nullable()->after('points');
            if (!Schema::hasColumn('shapes', 'stroke'))  $table->string('stroke', 8)->nullable()->after('fill');
            if (!Schema::hasColumn('shapes', 'strokeWidth')) $table->unsignedInteger('strokeWidth')->nullable()->after('stroke');
            if (!Schema::hasColumn('shapes', 'rotation'))    $table->double('rotation')->default(0)->after('strokeWidth');
            if (!Schema::hasColumn('shapes', 'closed'))      $table->boolean('closed')->nullable()->after('rotation');
            if (!Schema::hasColumn('shapes', 'color'))       $table->string('color', 8)->nullable()->after('closed');
        });
    }

    public function down(): void
    {
        Schema::table('shapes', function (Blueprint $table) {
            if (Schema::hasColumn('shapes', 'color')) $table->dropColumn('color');
            if (Schema::hasColumn('shapes', 'closed')) $table->dropColumn('closed');
            if (Schema::hasColumn('shapes', 'rotation')) $table->dropColumn('rotation');
            if (Schema::hasColumn('shapes', 'strokeWidth')) $table->dropColumn('strokeWidth');
            if (Schema::hasColumn('shapes', 'stroke')) $table->dropColumn('stroke');
            if (Schema::hasColumn('shapes', 'fill')) $table->dropColumn('fill');
            if (Schema::hasColumn('shapes', 'points')) $table->dropColumn('points');
            if (Schema::hasColumn('shapes', 'radiusY')) $table->dropColumn('radiusY');
            if (Schema::hasColumn('shapes', 'radiusX')) $table->dropColumn('radiusX');
        });
    }
};  