/**
 * hooks/useVoiceInput.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MediaRecorder-based voice input hook.
 *
 * Returns:
 *   isRecording  {boolean}  — true while mic is active
 *   transcript   {string}   — last recognised text (resets each start)
 *   isTranscribing {boolean} — true while waiting for Sarvam response
 *   error        {string|null} — last error message (null if none)
 *   startRecording() — opens mic and begins capturing
 *   stopRecording()  — stops mic and fires transcription request
 *
 * Usage:
 *   const { isRecording, transcript, startRecording, stopRecording } = useVoiceInput('kn')
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback } from 'react'
import { transcribeAudio, langCodeForLocale } from '../services/sarvamApi'

export default function useVoiceInput(lang = 'kn') {
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState(null)

    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])

    const startRecording = useCallback(async () => {
        setError(null)
        setTranscript('')

        let stream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (err) {
            setError('Microphone access denied. Please allow microphone access and try again.')
            return
        }

        // Prefer webm/opus when available (smaller, widely supported)
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : ''

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
            // Stop all mic tracks to release the browser mic indicator
            stream.getTracks().forEach(t => t.stop())

            const blob = new Blob(chunksRef.current, {
                type: mimeType || 'audio/webm',
            })
            chunksRef.current = []

            setIsTranscribing(true)
            try {
                const text = await transcribeAudio(blob, langCodeForLocale(lang))
                setTranscript(text)
            } catch (err) {
                setError(err.message || 'Transcription failed. Please try again.')
            } finally {
                setIsTranscribing(false)
            }
        }

        mediaRecorderRef.current = recorder
        recorder.start()
        setIsRecording(true)
    }, [lang])

    const stopRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop()
        }
        setIsRecording(false)
    }, [])

    return {
        isRecording,
        isTranscribing,
        transcript,
        error,
        startRecording,
        stopRecording,
    }
}
