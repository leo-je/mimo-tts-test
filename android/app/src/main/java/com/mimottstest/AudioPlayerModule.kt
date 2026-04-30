package com.mimottstest

import android.media.MediaPlayer
import com.facebook.react.bridge.*

class AudioPlayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var player: MediaPlayer? = null
    private var completionPromise: Promise? = null

    override fun getName() = "AudioPlayer"

    @ReactMethod
    fun play(path: String, promise: Promise) {
        try {
            releasePlayer()
            completionPromise = promise
            player = MediaPlayer().apply {
                setDataSource(path)
                setOnCompletionListener {
                    completionPromise?.resolve("completed")
                    completionPromise = null
                }
                setOnErrorListener { _, what, extra ->
                    completionPromise?.reject("PLAY_ERROR", "MediaPlayer error: $what, $extra")
                    completionPromise = null
                    true
                }
                prepare()
                start()
            }
        } catch (e: Exception) {
            completionPromise = null
            promise.reject("PLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        try {
            player?.let {
                if (it.isPlaying) {
                    it.pause()
                }
            }
            promise.resolve("paused")
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun resume(promise: Promise) {
        try {
            player?.let {
                if (!it.isPlaying) {
                    it.start()
                }
            }
            promise.resolve("resumed")
        } catch (e: Exception) {
            promise.reject("RESUME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            releasePlayer()
            completionPromise?.resolve("stopped")
            completionPromise = null
            promise.resolve("stopped")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun releasePlayer() {
        player?.let {
            try {
                if (it.isPlaying) it.stop()
            } catch (_: Exception) {}
            it.release()
        }
        player = null
    }
}
