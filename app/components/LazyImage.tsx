'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholderSrc?: string
  threshold?: number
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderSrc,
  threshold = 0.1
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin: '50px'
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* 占位符/骨架屏 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholderSrc ? (
            <Image
              src={placeholderSrc}
              alt={alt}
              fill
              className="object-cover opacity-50 blur-sm"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded-full" />
          )}
        </div>
      )}

      {/* 实际图片 */}
      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          fill={!width || !height}
          width={width}
          height={height}
          className={`object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl">🖼️</span>
            <p className="text-xs text-gray-400 mt-1">加载失败</p>
          </div>
        </div>
      )}
    </div>
  )
}

// 图片预加载Hook
export function useImagePreload(imageUrls: string[]) {
  useEffect(() => {
    imageUrls.forEach((url) => {
      const img = new window.Image()
      img.src = url
    })
  }, [imageUrls])
}

// 批量懒加载图片组件
export function LazyImageGrid({
  images,
  className = ''
}: {
  images: Array<{
    src: string
    alt: string
    width?: number
    height?: number
  }>
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((img, index) => (
        <LazyImage
          key={index}
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          className="rounded-xl aspect-square"
        />
      ))}
    </div>
  )
}