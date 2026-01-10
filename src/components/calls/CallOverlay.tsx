import type { ReactNode, RefObject } from 'react'
import {
  Maximize2,
  Mic,
  MicOff,
  Minus,
  Phone,
  PhoneOff,
  User,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CallState, User as UserType } from '@/types'

type CallOverlayProps = {
  callState: CallState
  callMinimized: boolean
  remoteVideoReady: boolean
  remoteCameraOn: boolean
  cameraEnabled: boolean
  micMuted: boolean
  speakerMuted: boolean
  remoteLevel: number
  localLevel: number
  activeName: string
  activeAvatarSrc: string
  userAvatarSrc: string
  user: UserType
  remoteVideoRef: RefObject<HTMLVideoElement>
  remoteMiniRef: RefObject<HTMLVideoElement>
  localVideoRef: RefObject<HTMLVideoElement>
  onToggleCamera: () => void
  onToggleMic: () => void
  onToggleSpeaker: () => void
  onAcceptCall: () => void
  onEndCall: () => void
  onToggleMinimized: (value: boolean) => void
  renderWaveform: (level: number) => ReactNode
  onRemoteVideoReady: (ready: boolean) => void
}

const CallOverlay = ({
  callState,
  callMinimized,
  remoteVideoReady,
  remoteCameraOn,
  cameraEnabled,
  micMuted,
  speakerMuted,
  remoteLevel,
  localLevel,
  activeName,
  activeAvatarSrc,
  userAvatarSrc,
  user,
  remoteVideoRef,
  remoteMiniRef,
  localVideoRef,
  onToggleCamera,
  onToggleMic,
  onToggleSpeaker,
  onAcceptCall,
  onEndCall,
  onToggleMinimized,
  renderWaveform,
  onRemoteVideoReady,
}: CallOverlayProps) => {
  if (callState.status === 'idle') return null

  return (
    <div
      className={`fixed inset-0 z-50 p-6 ${
        callMinimized
          ? 'bg-transparent pointer-events-none'
          : 'grid place-items-center bg-black/60'
      }`}
    >
      <div
        className={`fixed bottom-6 right-6 z-50 w-72 rounded-2xl glass p-4 shadow-xl transition ${
          callMinimized ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{activeName}</p>
            <p className="text-xs text-muted-foreground">
              {callState.status === 'incoming'
                ? 'Incoming call'
                : callState.status === 'calling'
                ? 'Calling...'
                : 'In call'}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleMinimized(false)}
            title="Maximize"
          >
                <Maximize2 size={16} />
          </Button>
        </div>
        <div className="relative mt-3 overflow-hidden rounded-xl">
          {callState.mode === 'voice' ? (
            <div className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-black/40">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                {activeAvatarSrc ? (
                  <img
                    src={activeAvatarSrc}
                    alt={activeName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white/80" />
                )}
              </div>
              {renderWaveform(remoteLevel)}
            </div>
          ) : (
            <>
              <video
                ref={remoteMiniRef}
                autoPlay
                playsInline
                className={`h-36 w-full rounded-xl bg-black/70 ${
                  remoteCameraOn ? '' : 'opacity-0'
                }`}
                onLoadedMetadata={(event) =>
                  event.currentTarget.play().catch(() => {})
                }
                onPlaying={() => onRemoteVideoReady(true)}
                onPause={() => onRemoteVideoReady(false)}
                onEnded={() => onRemoteVideoReady(false)}
              />
              {!remoteVideoReady || !remoteCameraOn ? (
                <div className="absolute bg-black/40 flex flex-col h-full justify-center place-items-center rounded-xl top-0 w-full">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {activeAvatarSrc ? (
                      <img
                        src={activeAvatarSrc}
                        alt={activeName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-white/80" />
                    )}
                  </div>
                  {!remoteCameraOn ? renderWaveform(remoteLevel) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {callState.status === 'incoming' ? (
            <>
              <Button
                size="icon"
                onClick={onAcceptCall}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                style={{ backgroundImage: 'none' }}
                title="Accept call"
              >
                <Phone size={18} />
              </Button>
              {callState.mode === 'video' ? (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onToggleCamera}
                  title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                </Button>
              ) : null}
              <Button
                size="icon"
                onClick={onEndCall}
                className="bg-red-500 text-white hover:bg-red-600"
                style={{ backgroundImage: 'none' }}
                title="Decline call"
              >
                <PhoneOff size={18} />
              </Button>
            </>
          ) : (
            <>
              {callState.mode === 'video' ? (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onToggleCamera}
                  title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                </Button>
              ) : null}
              <Button size="icon" variant="secondary" onClick={onToggleMic} title="Mute mic">
                {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={onToggleSpeaker}
                title="Mute speaker"
              >
                {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
              <Button
                size="icon"
                onClick={onEndCall}
                className="bg-red-500 text-white hover:bg-red-600"
                style={{ backgroundImage: 'none' }}
                title="End call"
              >
                <PhoneOff size={18} />
              </Button>
            </>
          )}
        </div>
      </div>
      <div
        className={`w-full max-w-3xl lg:max-w-[calc(100vw-400px)] space-y-4 rounded-2xl glass p-2 lg:p-6 transition ${
          callMinimized ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{activeName}</p>
            <p className="text-xs text-muted-foreground">
              {callState.status === 'incoming'
                ? 'Incoming call'
                : callState.status === 'calling'
                ? 'Calling...'
                : 'In call'}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleMinimized(true)}
            title="Minimize"
          >
            <Minus size={18} />
          </Button>
        </div>
        <div className="grid relative gap-4 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            {callState.mode === 'voice' ? (
              <div className="flex h-64 lg:h-[calc(80vh)] w-full flex-col items-center justify-center rounded-xl bg-black/50">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                  {activeAvatarSrc ? (
                    <img
                      src={activeAvatarSrc}
                      alt={activeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={28} className="text-white/80" />
                  )}
                </div>
                {renderWaveform(remoteLevel)}
              </div>
            ) : (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`h-[calc(80vh)] lg:h-[calc(100vh-400px)] w-full rounded-xl bg-black/70 ${
                    remoteCameraOn ? '' : 'opacity-0'
                  }`}
                  onLoadedMetadata={(event) =>
                    event.currentTarget.play().catch(() => {})
                  }
                  onPlaying={() => onRemoteVideoReady(true)}
                  onPause={() => onRemoteVideoReady(false)}
                  onEnded={() => onRemoteVideoReady(false)}
                />
                {!remoteVideoReady || !remoteCameraOn ? (
                  <div className="absolute bg-black/40 flex flex-col h-full justify-center place-items-center rounded-xl top-0 w-full">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                      {activeAvatarSrc ? (
                        <img
                          src={activeAvatarSrc}
                          alt={activeName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-white/80" />
                      )}
                    </div>
                    {!remoteCameraOn ? renderWaveform(remoteLevel) : null}
                  </div>
                ) : null}
                <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {activeName}
                </div>
              </>
            )}
          </div>
          <div className="absolute right-2 top-2 w-24 lg:relative lg:right-auto lg:w-auto lg:top-auto">
            <div className="hidden -translate-x-1/2 -translate-y-1 absolute lg:block lg:top-72 left-1/2 z-10">
              {callState.status === 'incoming' ? (
                <div className="flex gap-3">
                  <Button
                    size="icon"
                    onClick={onAcceptCall}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                    style={{ backgroundImage: 'none' }}
                    title="Accept call"
                  >
                    <Phone size={18} />
                  </Button>
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={onToggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    onClick={onEndCall}
                    className="bg-red-500 text-white hover:bg-red-600"
                    style={{ backgroundImage: 'none' }}
                    title="Decline call"
                  >
                    <PhoneOff size={18} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={onToggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button size="icon" variant="secondary" onClick={onToggleMic} title="Mute mic">
                    {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={onToggleSpeaker}
                    title="Mute speaker"
                  >
                    {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    onClick={onEndCall}
                    className="bg-red-500 text-white hover:bg-red-600"
                    style={{ backgroundImage: 'none' }}
                    title="End call"
                  >
                    <PhoneOff size={18} />
                  </Button>
                </div>
              )}
            </div>
            {callState.mode === 'voice' ? (
              <div className="flex h-40 lg:h-64 w-full flex-col items-center justify-center rounded-xl bg-black/50">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                  {userAvatarSrc ? (
                    <img
                      src={userAvatarSrc}
                      alt={user.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-white/80" />
                  )}
                </div>
                {renderWaveform(localLevel)}
              </div>
            ) : cameraEnabled ? (
              <div className="relative h-40 lg:h-64 w-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full rounded-xl bg-black/70"
                  onLoadedMetadata={(event) =>
                    event.currentTarget.play().catch(() => {})
                  }
                />
                <div className="absolute bottom-2 left-2 lg:bottom rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                  {user.displayName}
                </div>
              </div>
            ) : (
              <div className="flex h-40 lg:h-64 w-full flex-col items-center justify-center rounded-xl bg-black/50">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                  {userAvatarSrc ? (
                    <img
                      src={userAvatarSrc}
                      alt={user.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-white/80" />
                  )}
                </div>
                <p className="mt-2 text-xs text-white/70">Camera off</p>
              </div>
            )}
          </div>
          <div
            className={`block -translate-x-1/2 -translate-y-1 absolute ${
              callState.mode === 'video' ? 'bottom-10' : 'bottom-2'
            } left-1/2 z-10 lg:hidden`}
          >
            {callState.status === 'incoming' ? (
              <div className="flex gap-3">
                <Button
                  size="icon"
                  onClick={onAcceptCall}
                  className="bg-emerald-500 text-white hover:bg-emerald-600"
                  style={{ backgroundImage: 'none' }}
                  title="Accept call"
                >
                  <Phone size={18} />
                </Button>
                {callState.mode === 'video' ? (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={onToggleCamera}
                    title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  onClick={onEndCall}
                  className="bg-red-500 text-white hover:bg-red-600"
                  style={{ backgroundImage: 'none' }}
                  title="Decline call"
                >
                  <PhoneOff size={18} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {callState.mode === 'video' ? (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={onToggleCamera}
                    title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                  </Button>
                ) : null}
                <Button size="icon" variant="secondary" onClick={onToggleMic} title="Mute mic">
                  {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onToggleSpeaker}
                  title="Mute speaker"
                >
                  {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </Button>
                <Button
                  size="icon"
                  onClick={onEndCall}
                  className="bg-red-500 text-white hover:bg-red-600"
                  style={{ backgroundImage: 'none' }}
                  title="End call"
                >
                  <PhoneOff size={18} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CallOverlay
