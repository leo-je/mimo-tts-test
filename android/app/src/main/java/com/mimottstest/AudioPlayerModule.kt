package com.mimottstest

import android.media.MediaPlayer
import android.media.PlaybackParams
import android.os.Build
import com.facebook.react.bridge.*

class AudioPlayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var player: MediaPlayer? = null
    private var completionPromise: Promise? = null
    private var currentSpeed: Float = 1.0f

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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && currentSpeed != 1.0f) {
                    playbackParams = playbackParams.setSpeed(currentSpeed)
                }
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
                if (it.isPlaying) it.pause()
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
                if (!it.isPlaying) it.start()
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

    @ReactMethod
    fun getDuration(promise: Promise) {
        try {
            val dur = player?.duration ?: 0
            promise.resolve(dur.toDouble())
        } catch (e: Exception) {
            promise.reject("DURATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        try {
            val pos = player?.currentPosition ?: 0
            promise.resolve(pos.toDouble())
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun seekTo(positionMs: Double, promise: Promise) {
        try {
            player?.seekTo(positionMs.toInt())
            promise.resolve("seeked")
        } catch (e: Exception) {
            promise.reject("SEEK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setSpeed(speed: Float, promise: Promise) {
        try {
            currentSpeed = speed
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                player?.let {
                    it.playbackParams = it.playbackParams.setSpeed(speed)
                }
            }
            promise.resolve("speed set")
        } catch (e: Exception) {
            promise.reject("SPEED_ERROR", e.message, e)
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
