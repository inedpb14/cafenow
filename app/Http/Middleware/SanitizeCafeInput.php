<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Cafe\CafeProfileInput;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Layer 2 of the cafe profile contract: normalize whitespace and enforce the
 * character whitelist / length limits from CafeProfileInput before the request
 * ever reaches the controller. Fails with the usual 422 + error bag so Inertia
 * renders the same field errors as the controller would.
 */
class SanitizeCafeInput
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($errors = CafeProfileInput::inspect($request->all())) {
            throw ValidationException::withMessages($errors);
        }

        $clean = [];

        foreach (array_keys(CafeProfileInput::FIELDS) as $field) {
            if ($request->exists($field)) {
                $clean[$field] = CafeProfileInput::clean($request->input($field));
            }
        }

        if ($clean !== []) {
            $request->merge($clean);
        }

        return $next($request);
    }
}
