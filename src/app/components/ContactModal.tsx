import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Resizable } from 're-resizable';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContactFormData {
  yourEmail: string;
  yourSubject: string;
  yourMessage: string;
}

export const ContactModal = ({ isOpen, onClose }: ContactModalProps) => {
  const { lang } = useLanguage();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Toggle body class for global styling hooks (Mobile Header Hiding)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('contact-modal-open');
    } else {
      document.body.classList.remove('contact-modal-open');
    }
    return () => {
      document.body.classList.remove('contact-modal-open');
    };
  }, [isOpen]);

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      // Formspree 엔드포인트 — https://formspree.io 에서 폼 생성 후 아래 ID를 교체하세요
      const FORMSPREE_ID = 'mgopagly';
      const response = await axios.post(
        `https://formspree.io/f/${FORMSPREE_ID}`,
        {
          email: data.yourEmail,
          subject: data.yourSubject || 'Portfolio Inquiry',
          message: data.yourMessage,
          _replyto: data.yourEmail,
        },
        {
          headers: { 'Accept': 'application/json' }
        }
      );

      if (response.status === 200) {
        toast.success("Message sent successfully.");
        reset();
        onClose();
      } else {
        toast.error("Failed to send message.");
      }
    } catch (error: any) {
      console.error("Submission Error:", error);
      const msg = error?.response?.data?.error || "An error occurred. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          ref={panelRef}
          className={`fixed z-[99999999] ${isMobile ? 'top-[20px] left-[20px] w-[calc(100vw-40px)] h-[70vh]' : 'w-fit h-fit'}`}
          style={isMobile ? { position: 'fixed' } : { position: 'fixed', left: typeof window !== 'undefined' ? Math.max(20, window.innerWidth / 2 - 250) : 100, top: 100, width: 'fit-content', height: 'fit-content' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`shadow-2xl bg-background/95 backdrop-blur-md border border-foreground/10 overflow-hidden ${isMobile ? 'w-full h-full rounded-sm' : 'rounded-sm'}`}
          >
            <Resizable
              defaultSize={isMobile ? { width: '100%', height: '100%' } : { width: 500, height: 600 }}
              minWidth={isMobile ? 300 : 350}
              minHeight={isMobile ? 300 : 400}
              maxWidth={1000}
              enable={!isMobile ? { right: true, bottom: true, bottomRight: true } : false}
              className="flex flex-col h-full relative"
            >
              {/* Drag Handle - subtle top bar (desktop only) */}
              {!isMobile && (
                <div 
                  className="h-6 flex-shrink-0 flex items-center justify-center cursor-move select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const panel = panelRef.current;
                    if (!panel) return;
                    const rect = panel.getBoundingClientRect();
                    dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
                    
                    const onMouseMove = (ev: MouseEvent) => {
                      if (!dragState.current || !panel) return;
                      const dx = ev.clientX - dragState.current.startX;
                      const dy = ev.clientY - dragState.current.startY;
                      panel.style.left = `${dragState.current.startLeft + dx}px`;
                      panel.style.top = `${dragState.current.startTop + dy}px`;
                    };
                    const onMouseUp = () => {
                      dragState.current = null;
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                >
                  <div className="w-10 h-[1.5px] bg-foreground/10 rounded-full" />
                </div>
              )}

              {/* Close button - floating top right */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose();
                }}
                className="absolute top-2 right-3 z-20 text-muted-foreground/30 hover:text-foreground/70 transition-colors duration-300 p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center cursor-pointer"
              >
                <X size={13} />
              </button>

              {/* Content */}
              <div className="flex-grow flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                    
                  {/* Header Fields (To, From, Subject) */}
                  <div className="px-6 py-2 border-b border-foreground/5 space-y-1 flex-shrink-0">
                    
                    {/* Title */}
                    <div className="pt-2 pb-3">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-muted-foreground/50">New Message</span>
                    </div>

                    {/* To Field - Static */}
                    <div className="flex items-center py-2 border-b border-foreground/5">
                      <span className="w-16 text-xs font-medium text-muted-foreground">To:</span>
                      <span className="text-sm font-light text-foreground/80">astradiog@gmail.com</span>
                    </div>

                    {/* From Field - Email Input */}
                    <div className="flex items-center py-2 border-b border-foreground/5">
                      <span className="w-16 text-xs font-medium text-muted-foreground">From:</span>
                      <div className="flex-1 relative">
                        <input
                          {...register("yourEmail", { 
                            required: true,
                            pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                          })}
                          placeholder="name@example.com"
                          type="email"
                          className="w-full bg-transparent text-sm font-light focus:outline-none focus:text-foreground transition-colors placeholder:text-muted-foreground/30"
                        />
                        {errors.yourEmail && <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-red-500">Invalid email</span>}
                      </div>
                    </div>

                    {/* Subject Field */}
                    <div className="flex items-center py-2">
                      <span className="w-16 text-xs font-medium text-muted-foreground">Subject:</span>
                      <input
                        {...register("yourSubject")}
                        placeholder="Project Inquiry"
                        className="flex-1 bg-transparent text-sm font-light focus:outline-none focus:text-foreground transition-colors placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="px-6 py-4 flex-grow bg-background/50 flex flex-col">
                    <textarea
                      {...register("yourMessage", { required: true })}
                      placeholder="Write your message..."
                      className="w-full h-full bg-transparent text-sm font-light leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground/30"
                    />
                    {errors.yourMessage && <span className="text-[9px] text-red-500 mt-1 block">Message is required</span>}
                  </div>

                  {/* Footer / Send Button */}
                  <div className="px-6 py-4 bg-muted/5 border-t border-foreground/5 flex justify-end flex-shrink-0">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="text-[10px] tracking-[0.2em] uppercase hover:text-foreground/60 transition-colors disabled:opacity-50 flex items-center gap-2 bg-foreground text-background px-6 py-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          SENDING...
                        </>
                      ) : (
                        "SEND MESSAGE"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </Resizable>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};