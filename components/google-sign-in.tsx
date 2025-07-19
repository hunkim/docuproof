"use client"

import { Button } from "@/components/ui/button"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function GoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)

      toast({
        title: "Welcome!",
        description: "You have successfully signed in.",
      })
    } catch (error: any) {
      console.error("Error signing in:", error)
      toast({
        title: "Sign in failed",
        description: error.message || "There was an error signing in. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleGoogleSignIn} disabled={isLoading} size="lg" className="bg-blue-600 hover:bg-blue-700">
      {isLoading ? "Signing in..." : "Sign in with Google"}
    </Button>
  )
}
