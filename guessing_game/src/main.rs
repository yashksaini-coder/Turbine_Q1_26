use rand::Rng;
use std::io;

fn main() {
    println!("🎯 Welcome to the Guessing Game!");
    println!("Guess a number between 1 and 100");

    let secret_number = rand::rng().random_range(1..=100);

    loop {
        println!("\nEnter your guess:");

        let mut guess = String::new();
        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read input");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("❌ Please enter a valid number!");
                continue;
            }
        };

        if guess < secret_number {
            println!("📉 Too small!");
        } else if guess > secret_number {
            println!("📈 Too big!");
        } else {
            println!("🎉 Correct! You guessed the number!");
            break;
        }
    }
}
