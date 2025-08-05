"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Download, RotateCcw, Palette, Upload, Film, X, Info, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FilterType = "color" | "bw" | "sepia" | "red" | "blue" | "grain"
type LayoutType = "horizontal" | "vertical"

export default function Rollo35PhotoboothApp() {
  const [photos, setPhotos] = useState<string[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [filterMode, setFilterMode] = useState<FilterType>("color")
  const [layoutMode, setLayoutMode] = useState<LayoutType>("horizontal")
  const [mode, setMode] = useState<"camera" | "upload">("camera")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAbout, setShowAbout] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const filmStripRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const applyVintageFilter = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, filter: FilterType) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      switch (filter) {
        case "bw":
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
          break
        case "sepia":
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
          break
        case "red":
          data[i] = Math.min(255, r * 1.2)
          data[i + 1] = Math.max(0, g * 0.6)
          data[i + 2] = Math.max(0, b * 0.6)
          break
        case "blue":
          data[i] = Math.max(0, r * 0.6)
          data[i + 1] = Math.max(0, g * 0.8)
          data[i + 2] = Math.min(255, b * 1.3)
          break
        case "grain":
          const noise = (Math.random() - 0.5) * 50
          data[i] = Math.max(0, Math.min(255, r + noise))
          data[i + 1] = Math.max(0, Math.min(255, g + noise))
          data[i + 2] = Math.max(0, Math.min(255, b + noise))
          break
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  const addDateTimeStamp = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timestamp: Date) => {
    const timeString = timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    ctx.font = "16px 'Courier New', monospace"
    ctx.fillStyle = "#FFD700"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2

    const x = canvas.width - 120
    const y = canvas.height - 20

    ctx.strokeText(timeString, x, y)
    ctx.fillText(timeString, x, y)
  }

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 400
    canvas.height = 300

    // Draw the video frame
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    // Apply vintage filter
    if (filterMode !== "color") {
      applyVintageFilter(canvas, ctx, filterMode)
    }

    // Add date/time stamp
    addDateTimeStamp(ctx, canvas, new Date())

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8)

    setPhotos((prev) => {
      const newPhotos = [...prev]
      newPhotos[currentPhotoIndex] = photoDataUrl
      return newPhotos
    })

    if (currentPhotoIndex < 2) {
      setCurrentPhotoIndex((prev) => prev + 1)
    } else {
      stopCamera()
      setIsCapturing(false)
    }
  }, [currentPhotoIndex, filterMode, stopCamera])

  // Update the handleFileUpload function to handle multiple files
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      // Convert FileList to Array and limit to 3 files
      const fileArray = Array.from(files).slice(0, 3)

      // Process each file
      fileArray.forEach((file, fileIndex) => {
        if (!file.type.startsWith("image/")) return

        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            if (!canvasRef.current) return

            const canvas = canvasRef.current
            const ctx = canvas.getContext("2d")
            if (!ctx) return

            canvas.width = 400
            canvas.height = 300

            // Calculate dimensions to maintain aspect ratio
            const aspectRatio = img.width / img.height
            let drawWidth = canvas.width
            let drawHeight = canvas.height
            let offsetX = 0
            let offsetY = 0

            if (aspectRatio > canvas.width / canvas.height) {
              drawHeight = canvas.width / aspectRatio
              offsetY = (canvas.height - drawHeight) / 2
            } else {
              drawWidth = canvas.height * aspectRatio
              offsetX = (canvas.width - drawWidth) / 2
            }

            // Clear canvas and draw image
            ctx.fillStyle = "#000000"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

            // Apply vintage filter
            if (filterMode !== "color") {
              applyVintageFilter(canvas, ctx, filterMode)
            }

            // Add date/time stamp
            addDateTimeStamp(ctx, canvas, new Date())

            const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8)

            // Find the next available slot or use the current index
            setPhotos((prev) => {
              const newPhotos = [...prev]

              // Find first empty slot or use sequential order
              let targetIndex = -1
              for (let i = 0; i < 3; i++) {
                if (!newPhotos[i]) {
                  targetIndex = i
                  break
                }
              }

              // If no empty slot found, replace from current index
              if (targetIndex === -1) {
                targetIndex = (currentPhotoIndex + fileIndex) % 3
              }

              newPhotos[targetIndex] = photoDataUrl
              return newPhotos
            })

            // Update current index to next available slot
            if (fileIndex === fileArray.length - 1) {
              setCurrentPhotoIndex((prev) => {
                const filledSlots = photos.filter((photo) => photo).length + fileArray.length
                return Math.min(filledSlots, 2)
              })
            }
          }
          img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [currentPhotoIndex, filterMode, photos],
  )

  // Add a function to handle single photo replacement
  const replacePhoto = useCallback((index: number) => {
    setCurrentPhotoIndex(index)
    fileInputRef.current?.click()
  }, [])

  const removePhoto = useCallback(
    (index: number) => {
      setPhotos((prev) => {
        const newPhotos = [...prev]
        newPhotos[index] = ""
        return newPhotos
      })

      // Adjust current index if needed
      if (index < currentPhotoIndex) {
        setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))
      } else if (index === currentPhotoIndex && currentPhotoIndex > 0) {
        setCurrentPhotoIndex((prev) => prev - 1)
      }
    },
    [currentPhotoIndex],
  )

  const createFilmStrip = useCallback(() => {
    if (!filmStripRef.current || photos.length !== 3) return

    const canvas = filmStripRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (layoutMode === "horizontal") {
      // Horizontal film strip
      const photoWidth = 200
      const photoHeight = 150
      const spacing = 15
      const borderWidth = 40
      const holeSize = 12
      const holeSpacing = 20

      canvas.width = photoWidth * 3 + spacing * 2 + borderWidth * 2
      canvas.height = photoHeight + borderWidth * 2

      // Film background
      ctx.fillStyle = "#2a2a2a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Film perforations
      ctx.fillStyle = "#000000"
      const holesPerSide = Math.floor(canvas.height / holeSpacing)

      for (let i = 0; i < holesPerSide; i++) {
        const y = i * holeSpacing + holeSpacing / 2
        // Left perforations
        ctx.fillRect(8, y - holeSize / 2, holeSize, holeSize)
        // Right perforations
        ctx.fillRect(canvas.width - 20, y - holeSize / 2, holeSize, holeSize)
      }

      // Draw photos
      photos.forEach((photo, index) => {
        const img = new Image()
        img.onload = () => {
          const x = borderWidth + index * (photoWidth + spacing)
          const y = borderWidth

          const tempCanvas = document.createElement("canvas")
          const tempCtx = tempCanvas.getContext("2d")
          if (!tempCtx) return

          tempCanvas.width = photoWidth
          tempCanvas.height = photoHeight
          tempCtx.drawImage(img, 0, 0, photoWidth, photoHeight)

          applyVintageFilter(tempCanvas, tempCtx, "bw")

          ctx.drawImage(tempCanvas, x, y)

          // Frame numbers
          ctx.font = "12px 'Courier New', monospace"
          ctx.fillStyle = "#FFD700"
          ctx.fillText(`${index + 1}`, x + 5, y + 15)
        }
        img.src = photo
      })
    } else {
      // Vertical film strip
      const photoWidth = 150
      const photoHeight = 200
      const spacing = 15
      const borderWidth = 40
      const holeSize = 12
      const holeSpacing = 20

      canvas.width = photoWidth + borderWidth * 2
      canvas.height = photoHeight * 3 + spacing * 2 + borderWidth * 2 + 40

      // Film background
      ctx.fillStyle = "#2a2a2a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add "DATE Here" text at top
      ctx.font = "16px 'Courier New', monospace"
      ctx.fillStyle = "#FFD700"
      ctx.textAlign = "center"
      ctx.fillText("DATE HERE", canvas.width / 2, 25)

      // Film perforations
      ctx.fillStyle = "#000000"
      const holesPerSide = Math.floor(canvas.width / holeSpacing)

      for (let i = 0; i < holesPerSide; i++) {
        const x = i * holeSpacing + holeSpacing / 2
        // Top perforations
        ctx.fillRect(x - holeSize / 2, 8, holeSize, holeSize)
        // Bottom perforations
        ctx.fillRect(x - holeSize / 2, canvas.height - 20, holeSize, holeSize)
      }

      // Draw photos vertically
      photos.forEach((photo, index) => {
        const img = new Image()
        img.onload = () => {
          const x = borderWidth
          const y = borderWidth + 40 + index * (photoHeight + spacing)

          const tempCanvas = document.createElement("canvas")
          const tempCtx = tempCanvas.getContext("2d")
          if (!tempCtx) return

          tempCanvas.width = photoWidth
          tempCanvas.height = photoHeight
          tempCtx.drawImage(img, 0, 0, photoWidth, photoHeight)

          applyVintageFilter(tempCanvas, tempCtx, "bw")

          ctx.drawImage(tempCanvas, x, y)

          // Frame numbers
          ctx.font = "12px 'Courier New', monospace"
          ctx.fillStyle = "#FFD700"
          ctx.fillText(`${index + 1}`, x + 5, y + 15)
        }
        img.src = photo
      })
    }
  }, [photos, layoutMode])

  const downloadFilmStrip = useCallback(
    (format: "jpg" | "png") => {
      if (!filmStripRef.current) return

      createFilmStrip()

      setTimeout(() => {
        const canvas = filmStripRef.current!
        const link = document.createElement("a")
        link.download = `el-flash-olvidado-${layoutMode}.${format}`
        link.href = canvas.toDataURL(format === "jpg" ? "image/jpeg" : "image/png", 0.9)
        link.click()
      }, 200)
    },
    [createFilmStrip, layoutMode],
  )

  const resetPhotos = () => {
    setPhotos([])
    setCurrentPhotoIndex(0)
    setIsCapturing(false)
    stopCamera()
  }

  const startPhotoshoot = () => {
    setIsCapturing(true)
    setCurrentPhotoIndex(0)
    setPhotos([])
    startCamera()
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Large Time Display at Top */}
      <div className="w-full bg-gray-50 border-b border-gray-200 py-4">
        <div className="text-center">
          <div className="text-4xl font-mono text-gray-800 font-bold tracking-wider">
            {currentTime.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
          <div className="text-sm text-gray-600 mt-1" style={{ fontFamily: "serif" }}>
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar with Rollo 35 Icon */}
        <div className="w-32 bg-gray-50 border-r border-gray-200 min-h-screen flex flex-col items-center py-8">
          {/* Round Rollo 35 Icon */}
          <button
            onClick={() => setShowAbout(true)}
            className="w-20 h-20 rounded-full bg-white shadow-lg border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 hover:shadow-xl overflow-hidden group"
          >
            <img
              src="/rollo-35-film.png"
              alt="Rollo 35"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            />
          </button>

          <div className="mt-3 text-center">
            <div className="text-xs font-bold text-gray-800" style={{ fontFamily: "italic" }}>
              ROLLO 35
            </div>
            <div className="text-xs text-gray-600" style={{ fontFamily: "serif" }}>
              VINTAGE
            </div>
          </div>

          <button
            onClick={() => setShowAbout(true)}
            className="mt-6 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="About"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl text-gray-900 mb-4" style={{ fontFamily: "italics" }}>
                 ROLLO 35
              </h1>
              <p className="text-lg text-gray-600" style={{ fontFamily: "italics" }}>
                Create authentic film strips.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Camera/Upload Section */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900 flex items-center gap-3 text-xl" style={{ fontFamily: "serif" }}>
                    <Camera className="w-6 h-6" />
                    Capture
                    {isCapturing && (
                      <Badge variant="secondary" className="ml-auto bg-gray-800 text-white text-xs">
                        Photo {currentPhotoIndex + 1}/3
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mode Selection */}
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200">
                    <Button
                      variant={mode === "camera" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("camera")}
                      className="flex-1 text-sm bg-gray-900 hover:bg-gray-800"
                      style={{ fontFamily: "serif" }}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
                    </Button>
                    <Button
                      variant={mode === "upload" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("upload")}
                      className="flex-1 text-sm"
                      style={{ fontFamily: "serif" }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>

                  {mode === "camera" ? (
                    !isCapturing ? (
                      <div className="text-center space-y-6">
                        <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                          <div className="text-center">
                            <Camera className="w-20 h-20 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600" style={{ fontFamily: "serif" }}>
                              Camera Preview
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={startPhotoshoot}
                          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6"
                          size="lg"
                          style={{ fontFamily: "serif" }}
                        >
                          <Camera className="w-5 h-5 mr-3" />
                          Start Photoshoot
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full aspect-video rounded-lg bg-black border-2 border-gray-300"
                        />
                        <Button
                          onClick={capturePhoto}
                          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6"
                          size="lg"
                          style={{ fontFamily: "serif" }}
                        >
                          <Camera className="w-5 h-5 mr-3" />
                          Capture Photo {currentPhotoIndex + 1}
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center space-y-6">
                      {/* Enhanced Photo Grid with Upload States */}
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((index) => (
                          <div key={index} className="relative group">
                            <div
                              className={`aspect-[4/3] rounded-lg border-2 transition-all duration-200 ${
                                photos[index]
                                  ? "border-green-400 bg-white"
                                  : "border-gray-300 border-dashed bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                              } overflow-hidden cursor-pointer`}
                              onClick={() => !photos[index] && fileInputRef.current?.click()}
                            >
                              {photos[index] ? (
                                <>
                                  <img
                                    src={photos[index] || "/placeholder.svg"}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Overlay with actions */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          replacePhoto(index)
                                        }}
                                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors"
                                        title="Replace photo"
                                      >
                                        <Upload className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removePhoto(index)
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                                        title="Remove photo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Photo number badge */}
                                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                    {index + 1}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: "serif" }}>
                                      Photo {index + 1}
                                    </span>
                                    <div className="text-gray-400 text-xs mt-1" style={{ fontFamily: "serif" }}>
                                      Click to upload
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Enhanced Upload Controls */}
                      <div className="space-y-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        {/* Upload Status */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: "serif" }}>
                              Upload progress
                            </span>
                            <span className="text-sm text-gray-600" style={{ fontFamily: "serif" }}>
                              {photos.filter((photo) => photo).length}/3 photos
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(photos.filter((photo) => photo).length / 3) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
                            size="lg"
                            disabled={photos.filter((photo) => photo).length >= 3}
                            style={{ fontFamily: "serif" }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {photos.filter((photo) => photo).length === 0
                              ? "Upload Photos (max. 3)"
                              : photos.filter((photo) => photo).length >= 3
                                ? "All photos uploaded"
                                : `Upload more photos (${3 - photos.filter((photo) => photo).length} remaining)`}
                          </Button>

                          {photos.some((photo) => photo) && (
                            <Button
                              onClick={resetPhotos}
                              variant="outline"
                              size="lg"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                              style={{ fontFamily: "serif" }}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Clear all
                            </Button>
                          )}
                        </div>

                        {/* Upload Tips */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500" style={{ fontFamily: "serif" }}>
                            💡 You can select up to 3 photos at once. Formats: JPG, PNG, WEBP
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Settings Section */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900 flex items-center gap-3 text-xl" style={{ fontFamily: "serif" }}>
                    <Palette className="w-6 h-6" />
                    Vintage Effects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-gray-700 text-sm" style={{ fontFamily: "italic" }}>
                      Camera Filter:
                    </label>
                    <Select value={filterMode} onValueChange={(value: FilterType) => setFilterMode(value)}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="color">Color</SelectItem>
                        <SelectItem value="bw">Black & White</SelectItem>
                        <SelectItem value="sepia">Sepia Tone</SelectItem>
                        <SelectItem value="red">Red Tint</SelectItem>
                        <SelectItem value="blue">Blue Tint</SelectItem>
                        <SelectItem value="grain">Film Grain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-gray-700 text-sm" style={{ fontFamily: "serif" }}>
                      Film Strip Layout:
                    </label>
                    <Select value={layoutMode} onValueChange={(value: LayoutType) => setLayoutMode(value)}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal Strip</SelectItem>
                        <SelectItem value="vertical">Vertical Strip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-gray-700 text-sm mb-3" style={{ fontFamily: "serif" }}>
                      Rollo 35 Features:
                    </h4>
                    <ul className="text-gray-600 text-xs space-y-2" style={{ fontFamily: "serif" }}>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        Automatic timestamp overlay
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        Film grain & vintage effects
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        Authentic film perforations
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        Frame numbering
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Section */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900 flex items-center gap-3 text-xl" style={{ fontFamily: "serif" }}>
                    <Film className="w-6 h-6" />
                    Film Strip Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {photos.length === 0 ? (
                    <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <p className="text-gray-600" style={{ fontFamily: "serif" }}>
                        Photos will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((index) => (
                          <div
                            key={index}
                            className={`aspect-[4/3] rounded border-2 ${
                              photos[index]
                                ? "border-green-400"
                                : index === currentPhotoIndex && isCapturing
                                  ? "border-yellow-400 border-dashed"
                                  : "border-gray-300"
                            } overflow-hidden`}
                          >
                            {photos[index] ? (
                              <img
                                src={photos[index] || "/placeholder.svg"}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                <span className="text-gray-400 text-lg" style={{ fontFamily: "serif" }}>
                                  {index + 1}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {photos.length === 3 && (
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <Button
                              onClick={() => downloadFilmStrip("jpg")}
                              className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
                              variant="outline"
                              style={{ fontFamily: "serif" }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download JPG
                            </Button>
                            <Button
                              onClick={() => downloadFilmStrip("png")}
                              className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
                              variant="outline"
                              style={{ fontFamily: "serif" }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PNG
                            </Button>
                          </div>
                          <Button
                            onClick={resetPhotos}
                            variant="secondary"
                            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                            style={{ fontFamily: "serif" }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            New Film Strip
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Footer */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <h3 className="text-lg text-gray-800 mb-2" style={{ fontFamily: "italic" }}>
                Follow us on social media
              </h3>
            </div>

            <div className="flex items-center space-x-8">
              <a
                href="https://www.linkedin.com/in/sweta-n-56399017a/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-pink-600 transition-colors text-sm font-medium"
                style={{ fontFamily: "serif" }}
              >
                LinkedIn
              </a>
              <a
                href="https://x.com/_negioncrackk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium"
                style={{ fontFamily: "serif" }}
              >
                X
              </a>
            </div>

            <div className="text-center pt-4 border-t border-gray-200 w-full">
              <p className="text-xs text-gray-500" style={{ fontFamily: "serif" }}>
                © 2025 Rollo 35. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
                <img src="/rollo-35-film.png" alt="Rollo 35" className="w-full h-full object-cover" />
              </div>

              <h2 className="text-3xl text-gray-900 mb-2" style={{ fontFamily: "serif" }}>
                Rollo 35
              </h2>

              <div className="w-16 h-px bg-gray-400 mx-auto my-4"></div>

              <div className="space-y-3 text-gray-700" style={{ fontFamily: "serif" }}>
                <p className="text-lg">Folk Artist</p>
                <p className="text-lg">Photographer</p>
                <p className="text-lg">Designer</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600" style={{ fontFamily: "serif" }}>
                  The Forgotten Flash - A vintage photobooth experience with authentic film aesthetics and timeless
                  design.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={filmStripRef} className="hidden" />
    </div>
  )
}
